import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { createDatabase } from "@/db/client";
import { students } from "@/db/schema";
import { apiErrorResponse, ApiRouteError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { validatePassword } from "@/lib/auth/password-policy";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { createAuth } from "@/lib/auth/server";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";

const resetInput = z
  .object({
    temporaryPassword: z.string().min(10).max(128),
    reason: z.string().trim().min(3).max(500),
  })
  .superRefine((value, context) => {
    const passwordError = validatePassword(value.temporaryPassword);
    if (passwordError) {
      context.addIssue({ code: "custom", message: passwordError });
    }
  });

export async function POST(
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
    const input = resetInput.parse(await request.json().catch(() => ({})));
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

    const startedAt = Date.now();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE user SET must_change_password = 1, updated_at = ? WHERE id = ? AND role = 'STUDENT'",
      ).bind(startedAt, student.userId),
      env.DB.prepare("DELETE FROM session WHERE user_id = ?").bind(
        student.userId,
      ),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         VALUES (?, 'STUDENT_PASSWORD_RESET_STARTED', 'student', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        student.id,
        JSON.stringify({
          userId: student.userId,
          reason: input.reason,
          sessionsRevoked: true,
        }),
        startedAt,
        actor.user.id,
      ),
    ]);

    const resetResponse = await createAuth(env).api.setUserPassword({
      body: {
        newPassword: input.temporaryPassword,
        userId: student.userId,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!resetResponse.ok) {
      throw new ApiRouteError(
        503,
        "PASSWORD_RESET_FAILED",
        "Reset password belum berhasil. Akun tetap diamankan.",
      );
    }

    const completedAt = Date.now();
    await env.DB.prepare(
      `INSERT INTO audit_logs
       (id, action, entity_type, entity_id, metadata, created_at, created_by)
       VALUES (?, 'STUDENT_PASSWORD_RESET_COMPLETED', 'student', ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        student.id,
        JSON.stringify({ userId: student.userId }),
        completedAt,
        actor.user.id,
      )
      .run();

    return jsonResponse({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
