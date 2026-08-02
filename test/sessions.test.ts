import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import {
  businessDateTimeToEpoch,
  getBusinessDate,
} from "../src/lib/time/business-time";
import { sessionInputSchema } from "../src/modules/sessions/schema";
import {
  cancelSession,
  closeSession,
  createSession,
  getSessions,
  openSession,
  runAttendanceScheduler,
} from "../src/modules/sessions/service";

const dailyPayload = {
  sessionType: "DAILY",
  title: "",
  sessionDate: "2026-08-02",
  startTime: "07:00",
  endTime: "17:00",
  lateTime: "07:15",
  attendanceMode: "HYBRID",
  notes: null,
} as const;

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

async function seedSchedulerGroup(autoCreate = true) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user
       (id, name, email, email_verified, created_at, updated_at, username,
        role, banned, is_active, must_change_password)
       VALUES ('admin', 'Administrator', 'admin@users.zuhrirey.my.id', 0,
               ?, ?, 'admin', 'ADMIN', 0, 1, 0)`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO user
       (id, name, email, email_verified, created_at, updated_at, username,
        role, banned, is_active, must_change_password)
       VALUES ('student-user', 'Mahasiswa', '001@users.zuhrirey.my.id', 0,
               ?, ?, '001', 'STUDENT', 0, 1, 0)`,
    ).bind(now, now),
  ]);
  await env.DB.prepare(
    `INSERT INTO group_settings
     (id, name, period_start, period_end, timezone, daily_auto_create,
      daily_start_time, daily_end_time, daily_late_time, daily_default_mode,
      is_active, created_at, updated_at, created_by, updated_by)
     VALUES ('group', 'KKN Desa Kuncir 2026', '2026-08-01', '2026-09-01',
             'Asia/Jakarta', ?, '07:00:00', '17:00:00', '07:15:00',
             'HYBRID', 1, ?, ?, 'admin', 'admin')`,
  )
    .bind(autoCreate ? 1 : 0, now, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO students
     (id, user_id, group_id, nim, created_at, updated_at, created_by, updated_by)
     VALUES ('student', 'student-user', 'group', '001', ?, ?, 'admin', 'admin')`,
  )
    .bind(now, now)
    .run();
}

beforeEach(async () => {
  await resetDatabase();
  await seedSchedulerGroup();
});

describe("Phase 3 business time", () => {
  it("moves the business date at midnight Asia/Jakarta", () => {
    expect(getBusinessDate(Date.UTC(2026, 7, 1, 16, 59))).toBe("2026-08-01");
    expect(getBusinessDate(Date.UTC(2026, 7, 1, 17, 0))).toBe("2026-08-02");
    expect(businessDateTimeToEpoch("2026-08-02", "07:00")).toBe(
      Date.UTC(2026, 7, 2, 0, 0),
    );
  });

  it("rejects invalid time and late boundaries", () => {
    const result = sessionInputSchema.safeParse({
      ...dailyPayload,
      startTime: "17:00",
      endTime: "07:00",
      lateTime: "18:00",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["endTime", "lateTime"]),
    );
  });
});

describe("Phase 3 session lifecycle", () => {
  it("enforces one non-cancelled daily session per business date", async () => {
    const first = await createSession(env.DB, "admin", dailyPayload);
    await expect(
      createSession(env.DB, "admin", dailyPayload),
    ).rejects.toMatchObject({ code: "DAILY_SESSION_EXISTS", status: 409 });

    await cancelSession(env.DB, "admin", first.id, {
      reason: "Jadwal berubah",
    });
    await expect(
      createSession(env.DB, "admin", dailyPayload),
    ).resolves.toMatchObject({
      sessionType: "DAILY",
      status: "DRAFT",
    });
  });

  it("opens then closes a session and writes lifecycle audits", async () => {
    const session = await createSession(env.DB, "admin", {
      ...dailyPayload,
      sessionType: "EVENT",
      title: "Kerja bakti",
    });
    const opened = await openSession(
      env.DB,
      "admin",
      session.id,
      businessDateTimeToEpoch("2026-08-02", "08:00"),
    );
    const closed = await closeSession(env.DB, "admin", session.id);
    const audits = await env.DB.prepare(
      `SELECT action FROM audit_logs WHERE entity_id = ? ORDER BY created_at`,
    )
      .bind(session.id)
      .all<{ action: string }>();

    expect(opened.status).toBe("OPEN");
    expect(closed.status).toBe("CLOSED");
    expect(audits.results.map((row) => row.action)).toEqual([
      "SESSION_CREATED",
      "SESSION_OPENED",
      "SESSION_CLOSED",
    ]);
  });

  it("does not open an expired session", async () => {
    const session = await createSession(env.DB, "admin", dailyPayload);
    await expect(
      openSession(
        env.DB,
        "admin",
        session.id,
        businessDateTimeToEpoch("2026-08-02", "17:00"),
      ),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED", status: 409 });
  });
});

describe("Phase 3 scheduler", () => {
  it("auto-creates a daily session idempotently", async () => {
    const scheduledTime = Date.UTC(2026, 7, 2, 0, 5);
    const first = await runAttendanceScheduler(env.DB, scheduledTime);
    const second = await runAttendanceScheduler(env.DB, scheduledTime);
    const totals = await env.DB.prepare(
      `SELECT
        (SELECT count(*) FROM attendance_sessions WHERE session_type = 'DAILY') AS sessions,
        (SELECT count(*) FROM audit_logs WHERE action = 'SESSION_AUTO_CREATED') AS audits`,
    ).first<{ sessions: number; audits: number }>();

    expect(first).toMatchObject({
      businessDate: "2026-08-02",
      dailyCreated: true,
      insidePeriod: true,
    });
    expect(second.dailyCreated).toBe(false);
    expect(totals).toEqual({ sessions: 1, audits: 1 });
  });

  it("skips creation outside the configured period", async () => {
    const result = await runAttendanceScheduler(
      env.DB,
      Date.UTC(2026, 9, 1, 0, 5),
    );
    expect(result).toMatchObject({ insidePeriod: false, dailyCreated: false });
  });

  it("auto-closes expired open sessions with one audit", async () => {
    const now = Date.UTC(2026, 7, 2, 11, 5);
    await env.DB.prepare(
      `INSERT INTO attendance_sessions
       (id, session_type, title, session_date, starts_at, ends_at,
        attendance_mode, status, qr_version, created_at, updated_at,
        created_by, updated_by)
       VALUES ('expired', 'EVENT', 'Kegiatan selesai', '2026-08-02', ?, ?,
               'ADMIN_SCAN', 'OPEN', 1, ?, ?, 'admin', 'admin')`,
    )
      .bind(now - 7_200_000, now - 1, now - 7_200_000, now - 7_200_000)
      .run();

    const result = await runAttendanceScheduler(env.DB, now);
    const row = await env.DB.prepare(
      `SELECT status,
        (SELECT count(*) FROM audit_logs
         WHERE entity_id = 'expired' AND action = 'SESSION_AUTO_CLOSED') AS audits
       FROM attendance_sessions WHERE id = 'expired'`,
    ).first<{ status: string; audits: number }>();

    expect(result.expiredClosed).toBe(1);
    expect(row).toEqual({ status: "CLOSED", audits: 1 });
  });
});

describe("Phase 3 student session scope", () => {
  it("returns only currently active sessions without owned history", async () => {
    const active = await createSession(env.DB, "admin", {
      ...dailyPayload,
      sessionType: "EVENT",
      title: "Rapat aktif",
    });
    const now = businessDateTimeToEpoch("2026-08-02", "08:00");
    await openSession(env.DB, "admin", active.id, now);
    await createSession(env.DB, "admin", {
      ...dailyPayload,
      sessionType: "EVENT",
      title: "Masih draf",
    });

    const result = await getSessions(
      env.DB,
      new URLSearchParams(),
      { role: "STUDENT", studentId: "student" },
      now,
    );
    expect(result.items.map((session) => session.title)).toEqual([
      "Rapat aktif",
    ]);
  });
});
