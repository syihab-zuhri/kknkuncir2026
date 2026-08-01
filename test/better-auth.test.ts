import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  requireSession,
} from "../src/lib/auth/authorization";
import { createAuth } from "../src/lib/auth/server";
import type { AppEnv } from "../src/lib/cloudflare-env";

function testEnv(): AppEnv {
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(secretBytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return {
    ...env,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: "http://localhost",
  } as AppEnv;
}

describe("Better Auth on D1", () => {
  it("keeps public signup and username availability disabled", async () => {
    const auth = createAuth(testEnv());
    const headers = {
      "content-type": "application/json",
      origin: "http://localhost",
    };
    const signup = await auth.handler(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: "public@example.test",
          password: "notAllowed2026",
          name: "Public",
        }),
      }),
    );
    const availability = await auth.handler(
      new Request("http://localhost/api/auth/is-username-available", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: "001" }),
      }),
    );

    expect(signup.status).toBe(404);
    expect(availability.status).toBe(404);
  });

  it("authenticates by username and rejects an existing disabled session", async () => {
    const appEnv = testEnv();
    const auth = createAuth(appEnv);
    const created = await auth.api.createUser({
      body: {
        email: "admin@users.zuhrirey.my.id",
        password: "AdminPassword2026",
        name: "Admin",
        role: "ADMIN",
        data: {
          username: "admin",
          displayUsername: "admin",
          isActive: true,
          mustChangePassword: false,
        },
      },
    });
    await env.DB.prepare(
      "UPDATE user SET must_change_password = 0 WHERE id = ?",
    )
      .bind(created.user.id)
      .run();

    const signedIn = await auth.api.signInUsername({
      body: { username: "admin", password: "AdminPassword2026" },
      headers: new Headers({ origin: "http://localhost" }),
      asResponse: true,
    });
    const setCookie = signedIn.headers.get("set-cookie");

    expect(signedIn.status).toBe(200);
    expect(setCookie).toBeTruthy();
    expect(await signedIn.clone().text()).not.toContain("AdminPassword2026");

    const sessionHeaders = new Headers({
      cookie: setCookie?.split(";", 1)[0] ?? "",
    });
    const session = await requireSession(appEnv, sessionHeaders);
    expect(session.user.role).toBe("ADMIN");

    await env.DB.prepare(
      "UPDATE user SET is_active = 0, banned = 1 WHERE id = ?",
    )
      .bind(created.user.id)
      .run();

    await expect(requireSession(appEnv, sessionHeaders)).rejects.toMatchObject({
      code: "ACCOUNT_DISABLED",
      status: 403,
    } satisfies Partial<AuthorizationError>);
  });
});
