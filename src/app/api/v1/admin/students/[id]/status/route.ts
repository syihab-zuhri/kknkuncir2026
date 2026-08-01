import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { createDatabase } from "@/db/client";
import { students } from "@/db/schema";
import { apiErrorResponse, ApiRouteError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";

const statusInput = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});

export async function PATCH(
  request: Request,
  route: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const { id } = await route.params;
    const input = statusInput.parse(await request.json().catch(() => ({})));
    const database = createDatabase(env.DB);
    const student = await database.query.students.findFirst({
      columns: { id: true, userId: true },
      where: and(eq(students.id, id), isNull(students.deletedAt)),
    });

    if (!student) {
      throw new ApiRouteError(
        404,
        "STUDENT_NOT_FOUND",
        "Mahasiswa tidak ditemukan.",
      );
    }

    const now = Date.now();
    const statements = [
      env.DB.prepare(
        `UPDATE user
         SET is_active = ?, banned = ?, ban_reason = ?, updated_at = ?
         WHERE id = ? AND role = 'STUDENT'`,
      ).bind(
        input.isActive ? 1 : 0,
        input.isActive ? 0 : 1,
        input.isActive ? null : input.reason,
        now,
        student.userId,
      ),
      env.DB.prepare(
        "UPDATE students SET updated_at = ?, updated_by = ? WHERE id = ?",
      ).bind(now, actor.user.id, student.id),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         VALUES (?, ?, 'student', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        input.isActive ? "STUDENT_REACTIVATED" : "STUDENT_DEACTIVATED",
        student.id,
        JSON.stringify({
          userId: student.userId,
          reason: input.reason,
          sessionsRevoked: !input.isActive,
        }),
        now,
        actor.user.id,
      ),
    ];

    if (!input.isActive) {
      statements.splice(
        1,
        0,
        env.DB.prepare("DELETE FROM session WHERE user_id = ?").bind(
          student.userId,
        ),
      );
    }

    await env.DB.batch(statements);

    return jsonResponse({
      student: { id: student.id, isActive: input.isActive },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
