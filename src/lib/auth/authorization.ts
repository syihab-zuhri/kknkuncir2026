import { and, eq, isNull } from "drizzle-orm";

import { createDatabase } from "@/db/client";
import { students } from "@/db/schema";
import type { AppEnv } from "@/lib/cloudflare-env";

import type { AppRole } from "./access-control";
import { createAuth } from "./server";

export class AuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code:
      | "AUTH_REQUIRED"
      | "ACCOUNT_DISABLED"
      | "PASSWORD_CHANGE_REQUIRED"
      | "ROLE_FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type AuthContext = {
  user: {
    id: string;
    name: string;
    username: string | null;
    role: AppRole;
    mustChangePassword: boolean;
  };
  sessionId: string;
  studentId: string | null;
};

type AuthorizationOptions = {
  allowPasswordChange?: boolean;
  roles?: readonly AppRole[];
};

export async function requireSession(
  env: AppEnv,
  headers: Headers,
  options: AuthorizationOptions = {},
): Promise<AuthContext> {
  const auth = createAuth(env);
  const resolved = await auth.api.getSession({ headers });

  if (!resolved) {
    throw new AuthorizationError(
      401,
      "AUTH_REQUIRED",
      "Silakan masuk terlebih dahulu.",
    );
  }

  const { user, session } = resolved;
  const role = user.role;

  if (role !== "ADMIN" && role !== "STUDENT") {
    throw new AuthorizationError(403, "ROLE_FORBIDDEN", "Akses ditolak.");
  }

  if (!user.isActive || user.banned) {
    throw new AuthorizationError(
      403,
      "ACCOUNT_DISABLED",
      "Akun dinonaktifkan. Hubungi admin.",
    );
  }

  if (options.roles && !options.roles.includes(role)) {
    throw new AuthorizationError(403, "ROLE_FORBIDDEN", "Akses ditolak.");
  }

  if (user.mustChangePassword && !options.allowPasswordChange) {
    throw new AuthorizationError(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Password wajib diganti sebelum melanjutkan.",
    );
  }

  let studentId: string | null = null;

  if (role === "STUDENT") {
    const database = createDatabase(env.DB);
    const student = await database.query.students.findFirst({
      columns: { id: true },
      where: and(eq(students.userId, user.id), isNull(students.deletedAt)),
    });

    if (!student) {
      throw new AuthorizationError(
        403,
        "ACCOUNT_DISABLED",
        "Akun dinonaktifkan. Hubungi admin.",
      );
    }

    studentId = student.id;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username ?? null,
      role,
      mustChangePassword: user.mustChangePassword,
    },
    sessionId: session.id,
    studentId,
  };
}
