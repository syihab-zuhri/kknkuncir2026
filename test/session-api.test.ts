import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { createAuth } from "../src/lib/auth/server";
import type { AppEnv } from "../src/lib/cloudflare-env";
import { handleCreateSessionRequest } from "../src/modules/sessions/api";

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

async function resetDatabase() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM attendance_audits"),
    env.DB.prepare("DELETE FROM attendance_records"),
    env.DB.prepare("DELETE FROM attendance_sessions"),
    env.DB.prepare("DELETE FROM qr_credentials"),
    env.DB.prepare("DELETE FROM audit_logs"),
    env.DB.prepare("DELETE FROM students"),
    env.DB.prepare("DELETE FROM group_settings"),
    env.DB.prepare("DELETE FROM session"),
    env.DB.prepare("DELETE FROM account"),
    env.DB.prepare("DELETE FROM user"),
  ]);
}

beforeEach(resetDatabase);

describe("Phase 3 session endpoint authorization", () => {
  it("does not let an authenticated student create a session", async () => {
    const appEnv = testEnv();
    const auth = createAuth(appEnv);
    const admin = await auth.api.createUser({
      body: {
        email: "admin@users.zuhrirey.my.id",
        password: "AdminPassword2026",
        name: "Administrator",
        role: "ADMIN",
        data: {
          username: "admin",
          displayUsername: "admin",
          isActive: true,
          mustChangePassword: false,
        },
      },
    });
    const student = await auth.api.createUser({
      body: {
        email: "001@users.zuhrirey.my.id",
        password: "StudentPassword2026",
        name: "Mahasiswa",
        role: "STUDENT",
        data: {
          username: "001",
          displayUsername: "001",
          isActive: true,
          mustChangePassword: false,
        },
      },
    });
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO group_settings
       (id, name, period_start, period_end, timezone, daily_auto_create,
        daily_start_time, daily_end_time, daily_default_mode, is_active,
        created_at, updated_at, created_by, updated_by)
       VALUES ('group', 'KKN Desa Kuncir 2026', '2026-08-01', '2026-09-01',
               'Asia/Jakarta', 0, '07:00:00', '17:00:00', 'SELF_SCAN', 1,
               ?, ?, ?, ?)`,
    )
      .bind(now, now, admin.user.id, admin.user.id)
      .run();
    await env.DB.prepare(
      `INSERT INTO students
       (id, user_id, group_id, nim, created_at, updated_at, created_by, updated_by)
       VALUES ('student', ?, 'group', '001', ?, ?, ?, ?)`,
    )
      .bind(student.user.id, now, now, admin.user.id, admin.user.id)
      .run();

    const signIn = await auth.api.signInUsername({
      body: { username: "001", password: "StudentPassword2026" },
      headers: new Headers({ origin: "http://localhost" }),
      asResponse: true,
    });
    const response = await handleCreateSessionRequest(
      new Request("http://localhost/api/v1/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: signIn.headers.get("set-cookie")?.split(";", 1)[0] ?? "",
          origin: "http://localhost",
        },
        body: JSON.stringify({
          sessionType: "DAILY",
          sessionDate: "2026-08-02",
          startTime: "07:00",
          endTime: "17:00",
          attendanceMode: "SELF_SCAN",
        }),
      }),
      appEnv,
    );
    const total = await env.DB.prepare(
      "SELECT count(*) AS total FROM attendance_sessions",
    ).first<{ total: number }>();

    expect(response.status).toBe(403);
    expect(await response.text()).toContain("ROLE_FORBIDDEN");
    expect(total?.total).toBe(0);
  });
});
