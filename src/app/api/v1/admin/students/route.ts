import { eq } from "drizzle-orm";
import { z } from "zod";

import { createDatabase } from "@/db/client";
import { groupSettings } from "@/db/schema";
import { apiErrorResponse, ApiRouteError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import {
  createInternalEmail,
  isValidNim,
  normalizeNim,
} from "@/lib/auth/identity";
import { validatePassword } from "@/lib/auth/password-policy";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { createAuth } from "@/lib/auth/server";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";

const createStudentInput = z
  .object({
    nim: z.string().min(1).max(64),
    fullName: z.string().trim().min(2).max(120),
    temporaryPassword: z.string().min(10).max(128),
    phone: z.string().trim().max(30).optional(),
  })
  .superRefine((value, context) => {
    if (!isValidNim(value.nim)) {
      context.addIssue({ code: "custom", message: "Format NIM tidak valid." });
    }
    const passwordError = validatePassword(value.temporaryPassword);
    if (passwordError) {
      context.addIssue({ code: "custom", message: passwordError });
    }
  });

export async function POST(request: Request): Promise<Response> {
  let createdUserId: string | null = null;

  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const input = createStudentInput.parse(
      await request.json().catch(() => ({})),
    );
    const nim = normalizeNim(input.nim);
    const database = createDatabase(env.DB);
    const group = await database.query.groupSettings.findFirst({
      columns: { id: true },
      where: eq(groupSettings.isActive, true),
    });

    if (!group) {
      throw new ApiRouteError(
        409,
        "ACTIVE_GROUP_REQUIRED",
        "Konfigurasi kelompok aktif belum tersedia.",
      );
    }

    const created = await createAuth(env).api.createUser({
      body: {
        email: createInternalEmail(nim),
        password: input.temporaryPassword,
        name: input.fullName,
        role: "STUDENT",
        data: {
          username: nim,
          displayUsername: nim,
          isActive: true,
          mustChangePassword: true,
        },
      },
      headers: request.headers,
    });
    createdUserId = created.user.id;
    const studentId = crypto.randomUUID();
    const now = Date.now();

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO students
         (id, user_id, group_id, nim, phone, notes, deleted_at,
          created_at, updated_at, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
      ).bind(
        studentId,
        created.user.id,
        group.id,
        nim,
        input.phone || null,
        now,
        now,
        actor.user.id,
        actor.user.id,
      ),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         VALUES (?, 'STUDENT_PROVISIONED', 'student', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        studentId,
        JSON.stringify({ userId: created.user.id }),
        now,
        actor.user.id,
      ),
    ]);

    return jsonResponse(
      {
        student: {
          id: studentId,
          userId: created.user.id,
          groupId: group.id,
          nim,
          fullName: created.user.name,
          phone: input.phone || null,
          isActive: true,
          mustChangePassword: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (createdUserId) {
      try {
        await getAppEnv()
          .DB.prepare("DELETE FROM user WHERE id = ?")
          .bind(createdUserId)
          .run();
      } catch {
        console.error("Failed to clean up incomplete student provisioning", {
          userId: createdUserId,
        });
      }
    }

    if (
      error instanceof Error &&
      (error.message.includes("already exists") ||
        error.message.includes("UNIQUE constraint failed"))
    ) {
      return apiErrorResponse(
        new ApiRouteError(409, "NIM_ALREADY_EXISTS", "NIM sudah terdaftar."),
      );
    }

    return apiErrorResponse(error);
  }
}
