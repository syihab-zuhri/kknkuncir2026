import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { correctAttendanceAtomically } from "../src/db/attendance-repository";

async function seedAttendance() {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM attendance_audits"),
    env.DB.prepare("DELETE FROM attendance_records"),
    env.DB.prepare("DELETE FROM attendance_sessions"),
    env.DB.prepare("DELETE FROM qr_credentials"),
    env.DB.prepare("DELETE FROM students"),
    env.DB.prepare("DELETE FROM group_settings"),
    env.DB.prepare("DELETE FROM session"),
    env.DB.prepare("DELETE FROM account"),
    env.DB.prepare("DELETE FROM user"),
  ]);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user
       (id, name, email, email_verified, created_at, updated_at, username,
        role, banned, is_active, must_change_password)
       VALUES ('admin', 'Admin', 'admin@users.zuhrirey.my.id', 0, ?, ?,
               'admin', 'ADMIN', 0, 1, 0)`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO user
       (id, name, email, email_verified, created_at, updated_at, username,
        role, banned, is_active, must_change_password)
       VALUES ('student-user', 'Student', '001@users.zuhrirey.my.id', 0, ?, ?,
               '001', 'STUDENT', 0, 1, 0)`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO group_settings
       (id, name, period_start, period_end, timezone, daily_auto_create,
        daily_start_time, daily_end_time, daily_default_mode, is_active,
        created_at, updated_at, created_by, updated_by)
       VALUES ('group', 'Test Group', '2026-01-01', '2026-12-31',
               'Asia/Jakarta', 0, '07:00:00', '17:00:00', 'SELF_SCAN', 1,
               ?, ?, 'admin', 'admin')`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO students
       (id, user_id, group_id, nim, created_at, updated_at, created_by, updated_by)
       VALUES ('student', 'student-user', 'group', '001', ?, ?, 'admin', 'admin')`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO attendance_sessions
       (id, session_type, title, session_date, starts_at, ends_at,
        attendance_mode, status, qr_version, created_at, updated_at,
        created_by, updated_by)
       VALUES ('attendance-session', 'EVENT', 'Test', '2026-08-01', ?, ?,
               'ADMIN_SCAN', 'OPEN', 1, ?, ?, 'admin', 'admin')`,
    ).bind(now, now + 3_600_000, now, now),
    env.DB.prepare(
      `INSERT INTO attendance_records
       (id, session_id, student_id, status, method, recorded_at,
        location_status, revision, created_at, updated_at, created_by, updated_by)
       VALUES ('record', 'attendance-session', 'student', 'PRESENT',
               'ADMIN_SCAN', ?, 'NOT_REQUIRED', 1, ?, ?, 'admin', 'admin')`,
    ).bind(now, now, now),
  ]);
}

describe("D1 schema", () => {
  it("creates the complete Phase 1 table set", async () => {
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all<{ name: string }>();
    const names = tables.results.map((table) => table.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "account",
        "attendance_audits",
        "attendance_records",
        "attendance_sessions",
        "audit_logs",
        "group_settings",
        "qr_credentials",
        "session",
        "students",
        "user",
        "verification",
      ]),
    );
  });

  it("enforces the two-role constraint", async () => {
    const now = Date.now();
    await expect(
      env.DB.prepare(
        `INSERT INTO user
         (id, name, email, email_verified, created_at, updated_at, role,
          is_active, must_change_password)
         VALUES ('invalid', 'Invalid', 'invalid@example.test', 0, ?, ?,
                 'OWNER', 1, 1)`,
      )
        .bind(now, now)
        .run(),
    ).rejects.toThrow(/ck_user_role|CHECK constraint/i);
  });

  it("defaults every account to the STUDENT role instead of allowing null", async () => {
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO user
       (id, name, email, email_verified, created_at, updated_at,
        is_active, must_change_password)
       VALUES ('default-role', 'Default Role', 'default-role@example.test',
               0, ?, ?, 1, 1)`,
    )
      .bind(now, now)
      .run();

    const inserted = await env.DB.prepare(
      "SELECT role FROM user WHERE id = 'default-role'",
    ).first<{ role: string }>();

    expect(inserted?.role).toBe("STUDENT");
  });

  it("updates attendance and appends its audit in one batch", async () => {
    await seedAttendance();

    const revision = await correctAttendanceAtomically(env.DB, {
      attendanceId: "record",
      expectedRevision: 1,
      status: "PERMITTED",
      reason: "Koreksi pengujian",
      actorUserId: "admin",
      oldValues: JSON.stringify({ status: "PRESENT" }),
      newValues: JSON.stringify({ status: "PERMITTED" }),
    });
    const record = await env.DB.prepare(
      "SELECT status, revision FROM attendance_records WHERE id = 'record'",
    ).first<{ status: string; revision: number }>();
    const audit = await env.DB.prepare(
      "SELECT action, reason FROM attendance_audits WHERE attendance_id = 'record'",
    ).first<{ action: string; reason: string }>();

    expect(revision).toBe(2);
    expect(record).toEqual({ status: "PERMITTED", revision: 2 });
    expect(audit).toEqual({
      action: "STATUS_CHANGE",
      reason: "Koreksi pengujian",
    });
  });

  it("rejects a stale attendance correction without another audit", async () => {
    await seedAttendance();

    await expect(
      correctAttendanceAtomically(env.DB, {
        attendanceId: "record",
        expectedRevision: 9,
        status: "LATE",
        reason: "Stale revision",
        actorUserId: "admin",
        oldValues: "{}",
        newValues: "{}",
      }),
    ).rejects.toThrow("ATTENDANCE_REVISION_CONFLICT");

    const count = await env.DB.prepare(
      "SELECT count(*) AS count FROM attendance_audits",
    ).first<{ count: number }>();
    expect(count?.count).toBe(0);
  });
});
