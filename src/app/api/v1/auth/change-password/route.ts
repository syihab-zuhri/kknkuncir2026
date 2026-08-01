import { z } from "zod";

import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePassword,
} from "@/lib/auth/password-policy";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { createAuth } from "@/lib/auth/server";
import { getAppEnv } from "@/lib/cloudflare-env";
import { copySessionCookie, jsonResponse } from "@/lib/http";

const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  })
  .superRefine((value, context) => {
    const policyError = validatePassword(value.newPassword);
    if (policyError) {
      context.addIssue({ code: "custom", message: policyError });
    }
    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        message: "Password baru harus berbeda dari password saat ini.",
      });
    }
  });

export async function POST(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const context = await requireSession(env, request.headers, {
      allowPasswordChange: true,
    });
    const input = changePasswordInput.parse(
      await request.json().catch(() => ({})),
    );
    const authResponse = await createAuth(env).api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      return jsonResponse(
        {
          error: {
            code: "PASSWORD_CHANGE_FAILED",
            message: "Password saat ini tidak sesuai.",
          },
        },
        { status: 400 },
      );
    }

    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE user SET must_change_password = 0, updated_at = ? WHERE id = ?",
      ).bind(now, context.user.id),
      env.DB.prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         VALUES (?, 'PASSWORD_CHANGED', 'user', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        context.user.id,
        JSON.stringify({ forcedChangeCompleted: true }),
        now,
        context.user.id,
      ),
    ]);

    const headers = new Headers();
    copySessionCookie(authResponse, headers);
    return jsonResponse({ success: true }, { headers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
