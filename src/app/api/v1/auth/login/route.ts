import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { createDatabase } from "@/db/client";
import { session, students, user } from "@/db/schema";
import { apiErrorResponse } from "@/lib/api-errors";
import { normalizeNim } from "@/lib/auth/identity";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { createAuth } from "@/lib/auth/server";
import { getAppEnv } from "@/lib/cloudflare-env";
import { copySessionCookie, jsonResponse } from "@/lib/http";

const loginInput = z.object({
  nim: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

const authPayload = z.object({
  user: z.object({ id: z.string() }),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const input = loginInput.parse(await request.json().catch(() => ({})));
    const auth = createAuth(env);
    const authResponse = await auth.api.signInUsername({
      body: {
        username: normalizeNim(input.nim),
        password: input.password,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      const rateLimited = authResponse.status === 429;
      return jsonResponse(
        {
          error: {
            code: rateLimited ? "RATE_LIMITED" : "INVALID_CREDENTIALS",
            message: rateLimited
              ? "Terlalu banyak percobaan. Coba lagi nanti."
              : "NIM atau password tidak sesuai.",
          },
        },
        { status: rateLimited ? 429 : 401 },
      );
    }

    const payload = authPayload.parse(await authResponse.json());
    const database = createDatabase(env.DB);
    const account = await database.query.user.findFirst({
      columns: {
        id: true,
        name: true,
        username: true,
        role: true,
        banned: true,
        is_active: true,
        must_change_password: true,
      },
      where: eq(user.id, payload.user.id),
    });

    if (!account || (account.role !== "ADMIN" && account.role !== "STUDENT")) {
      await database.delete(session).where(eq(session.userId, payload.user.id));
      return jsonResponse(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "NIM atau password tidak sesuai.",
          },
        },
        { status: 401 },
      );
    }

    let studentIsActive = true;
    if (account.role === "STUDENT") {
      const student = await database.query.students.findFirst({
        columns: { id: true },
        where: and(eq(students.userId, account.id), isNull(students.deletedAt)),
      });
      studentIsActive = Boolean(student);
    }

    if (!account.is_active || account.banned || !studentIsActive) {
      await database.delete(session).where(eq(session.userId, account.id));
      return jsonResponse(
        {
          error: {
            code: "ACCOUNT_DISABLED",
            message: "Akun dinonaktifkan. Hubungi admin.",
          },
        },
        { status: 403 },
      );
    }

    const headers = new Headers();
    copySessionCookie(authResponse, headers);

    return jsonResponse(
      {
        user: {
          id: account.id,
          name: account.name,
          nim: account.username,
          role: account.role,
        },
        nextAction: account.must_change_password
          ? "CHANGE_PASSWORD"
          : account.role === "ADMIN"
            ? "ADMIN_HOME"
            : "STUDENT_HOME",
      },
      { headers },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
