import { APIError, createAuthMiddleware } from "better-auth/api";

import type { AppEnv } from "../cloudflare-env";
import { normalizeNim } from "./identity";

async function hashIdentifier(identifier: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeNim(identifier));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createLoginRateLimitHook(env: AppEnv) {
  return createAuthMiddleware(async (context) => {
    if (context.path !== "/sign-in/username") {
      return;
    }

    const username = context.body?.username;
    if (typeof username !== "string") {
      return;
    }

    const outcome = await env.LOGIN_RATE_LIMITER.limit({
      key: await hashIdentifier(username),
    });

    if (!outcome.success) {
      throw new APIError("TOO_MANY_REQUESTS", {
        message: "Terlalu banyak percobaan. Coba lagi nanti.",
      });
    }
  });
}

export function assertTrustedOrigin(request: Request, env: AppEnv): void {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(env.APP_URL).origin;

  if (origin !== expectedOrigin) {
    throw new APIError("FORBIDDEN", { message: "Origin request tidak valid." });
  }
}

export async function timingSafeTokenMatches(
  supplied: string,
  expected: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const suppliedBytes = new Uint8Array(suppliedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;

  for (let index = 0; index < suppliedBytes.length; index += 1) {
    difference |= suppliedBytes[index] ^ expectedBytes[index];
  }

  return difference === 0;
}
