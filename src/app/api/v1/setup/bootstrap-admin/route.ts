import { eq, sql } from "drizzle-orm";

import { createDatabase } from "@/db/client";
import { user } from "@/db/schema";
import { apiErrorResponse, ApiRouteError } from "@/lib/api-errors";
import {
  createInternalEmail,
  isValidNim,
  normalizeNim,
} from "@/lib/auth/identity";
import { validatePassword } from "@/lib/auth/password-policy";
import { timingSafeTokenMatches } from "@/lib/auth/security";
import { createAuth } from "@/lib/auth/server";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");
    const expectedToken = env.BOOTSTRAP_ADMIN_TOKEN;
    const username = normalizeNim(env.BOOTSTRAP_ADMIN_USERNAME ?? "");
    const password = env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
    const name = env.BOOTSTRAP_ADMIN_NAME?.trim() || "Administrator";

    if (!expectedToken || !username || !password) {
      throw new ApiRouteError(
        503,
        "BOOTSTRAP_NOT_CONFIGURED",
        "Bootstrap Admin belum dikonfigurasi.",
      );
    }

    if (!token || !(await timingSafeTokenMatches(token, expectedToken))) {
      throw new ApiRouteError(401, "INVALID_BOOTSTRAP_TOKEN", "Akses ditolak.");
    }

    const passwordError = validatePassword(password);
    if (!isValidNim(username) || passwordError) {
      throw new ApiRouteError(
        503,
        "BOOTSTRAP_CONFIGURATION_INVALID",
        "Konfigurasi bootstrap Admin tidak valid.",
      );
    }

    const database = createDatabase(env.DB);
    const [adminCount] = await database
      .select({ value: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, "ADMIN"));

    if ((adminCount?.value ?? 0) > 0) {
      throw new ApiRouteError(
        409,
        "BOOTSTRAP_ALREADY_COMPLETED",
        "Bootstrap Admin sudah pernah diselesaikan.",
      );
    }

    const created = await createAuth(env).api.createUser({
      body: {
        email: createInternalEmail(username),
        password,
        name,
        role: "ADMIN",
        data: {
          username,
          displayUsername: username,
          isActive: true,
          mustChangePassword: true,
        },
      },
    });
    const now = Date.now();

    try {
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE user
           SET role = 'ADMIN', is_active = 1, must_change_password = 1,
               updated_at = ?
           WHERE id = ?`,
        ).bind(now, created.user.id),
        env.DB.prepare(
          `INSERT INTO audit_logs
           (id, action, entity_type, entity_id, metadata, created_at, created_by)
           VALUES (?, 'ADMIN_BOOTSTRAPPED', 'user', ?, ?, ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          created.user.id,
          JSON.stringify({ initialPasswordChangeRequired: true }),
          now,
          created.user.id,
        ),
      ]);
    } catch (error) {
      await env.DB.prepare("DELETE FROM user WHERE id = ?")
        .bind(created.user.id)
        .run();
      throw error;
    }

    return jsonResponse(
      {
        user: {
          id: created.user.id,
          name: created.user.name,
          username,
          role: "ADMIN",
        },
        nextAction: "CHANGE_PASSWORD",
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
