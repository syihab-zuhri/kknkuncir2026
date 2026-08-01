import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { createDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import type { AppEnv } from "@/lib/cloudflare-env";

import { createLoginRateLimitHook } from "./security";
import { authSharedOptions } from "./shared-options";

export function createAuth(env: AppEnv) {
  const database = createDatabase(env.DB);
  const baseURL = env.BETTER_AUTH_URL || env.APP_URL;

  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET harus tersedia dan minimal 32 karakter.",
    );
  }

  return betterAuth({
    ...authSharedOptions,
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(env.APP_URL).origin],
    hooks: {
      before: createLoginRateLimitHook(env),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
    },
    advanced: {
      cookiePrefix: "kkndesakuncir",
      useSecureCookies: new URL(baseURL).protocol === "https:",
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
