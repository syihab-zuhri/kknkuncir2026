import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { analyzeStudentCsv, parseCsv } from "../src/modules/students/csv";
import {
  findStudentDetail,
  listStudents,
} from "../src/modules/students/repository";
import {
  changeStudentStatus,
  editStudent,
  generateTemporaryPassword,
} from "../src/modules/students/service";
import { groupSettingsInputSchema } from "../src/modules/group/schema";
import {
  getActiveGroup,
  updateGroupSettings,
} from "../src/modules/group/service";

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

async function seedGroupAndStudents() {
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
         VALUES ('user-a', 'Budi Santoso', '001@users.zuhrirey.my.id', 0,
                 ?, ?, '001', 'STUDENT', 0, 1, 0)`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO user
         (id, name, email, email_verified, created_at, updated_at, username,
          role, banned, is_active, must_change_password)
         VALUES ('user-b', 'Citra Ayu', '002@users.zuhrirey.my.id', 0,
                 ?, ?, '002', 'STUDENT', 1, 0, 1)`,
    ).bind(now, now),
  ]);
  await env.DB.prepare(
    `INSERT INTO group_settings
     (id, name, village, period_start, period_end, timezone,
      daily_auto_create, daily_start_time, daily_end_time, daily_late_time,
      daily_default_mode, is_active, created_at, updated_at, created_by, updated_by)
     VALUES ('group', 'KKN Desa Kuncir 2026', 'Kuncir', '2026-01-01',
             '2026-12-31', 'Asia/Jakarta', 0, '07:00:00', '17:00:00',
             '07:15:00', 'SELF_SCAN', 1, ?, ?, 'admin', 'admin')`,
  )
    .bind(now, now)
    .run();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO students
         (id, user_id, group_id, nim, phone, notes, created_at, updated_at,
          created_by, updated_by)
         VALUES ('student-a', 'user-a', 'group', '001', '081234', 'Koordinator',
                 ?, ?, 'admin', 'admin')`,
    ).bind(now, now),
    env.DB.prepare(
      `INSERT INTO students
         (id, user_id, group_id, nim, phone, created_at, updated_at,
          created_by, updated_by)
         VALUES ('student-b', 'user-b', 'group', '002', NULL,
                 ?, ?, 'admin', 'admin')`,
    ).bind(now, now),
  ]);
}

async function seedAttendance() {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO attendance_sessions
         (id, session_type, title, session_date, starts_at, ends_at,
          attendance_mode, status, qr_version, created_at, updated_at,
          created_by, updated_by)
         VALUES ('session-a', 'EVENT', 'Kegiatan', '2026-08-01', ?, ?,
                 'ADMIN_SCAN', 'OPEN', 1, ?, ?, 'admin', 'admin')`,
    ).bind(now, now + 3_600_000, now, now),
    env.DB.prepare(
      `INSERT INTO attendance_records
         (id, session_id, student_id, status, method, recorded_at,
          location_status, revision, created_at, updated_at, created_by, updated_by)
         VALUES ('record-a', 'session-a', 'student-a', 'PRESENT', 'ADMIN_SCAN',
                 ?, 'NOT_REQUIRED', 1, ?, ?, 'admin', 'admin')`,
    ).bind(now, now, now),
  ]);
}

beforeEach(async () => {
  await resetDatabase();
  await seedGroupAndStudents();
});

describe("Phase 2 group settings", () => {
  it("validates period and daily schedule boundaries", () => {
    const invalid = groupSettingsInputSchema.safeParse({
      name: "KKN Desa Kuncir 2026",
      village: "Kuncir",
      periodStart: "2026-08-20",
      periodEnd: "2026-08-01",
      dailyPolicy: {
        autoCreate: true,
        startTime: "17:00",
        endTime: "07:00",
        lateTime: "19:00",
        defaultMode: "SELF_SCAN",
      },
    });

    expect(invalid.success).toBe(false);
    expect(invalid.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining([
        "periodEnd",
        "dailyPolicy.endTime",
        "dailyPolicy.lateTime",
      ]),
    );
  });

  it("requires the group period to span at least two dates", () => {
    const invalid = groupSettingsInputSchema.safeParse({
      name: "KKN Desa Kuncir 2026",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-01",
      dailyPolicy: {
        autoCreate: false,
        startTime: "07:00",
        endTime: "17:00",
        lateTime: "07:15",
        defaultMode: "SELF_SCAN",
      },
    });

    expect(invalid.success).toBe(false);
    expect(invalid.error?.issues[0]?.path).toEqual(["periodEnd"]);
  });

  it("updates the singleton group and appends an audit", async () => {
    const updated = await updateGroupSettings(env.DB, "admin", {
      name: "KKN Kuncir Angkatan 2026",
      village: "Kuncir",
      district: "Kecamatan Contoh",
      regency: "Kabupaten Contoh",
      address: "Posko utama",
      periodStart: "2026-07-01",
      periodEnd: "2026-08-31",
      dailyPolicy: {
        autoCreate: false,
        startTime: "07:30",
        endTime: "17:00",
        lateTime: "07:45",
        defaultMode: "HYBRID",
      },
    });
    const audit = await env.DB.prepare(
      "SELECT action FROM audit_logs WHERE entity_id = 'group'",
    ).first<{ action: string }>();

    expect(updated.dailyPolicy.startTime).toBe("07:30:00");
    expect((await getActiveGroup(env.DB)).name).toBe(
      "KKN Kuncir Angkatan 2026",
    );
    expect(audit?.action).toBe("GROUP_SETTINGS_UPDATED");
  });
});

describe("Phase 2 student management", () => {
  it("searches and paginates students without returning deleted profiles", async () => {
    const result = await listStudents(env.DB, {
      q: "budi",
      status: "active",
      page: 1,
      pageSize: 20,
    });

    expect(result.pagination.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      nim: "001",
      fullName: "Budi Santoso",
    });
  });

  it("scopes an owned profile in the D1 query", async () => {
    const own = await findStudentDetail(env.DB, "student-a", "user-a");
    const other = await findStudentDetail(env.DB, "student-b", "user-a");

    expect(own?.nim).toBe("001");
    expect(other).toBeNull();
  });

  it("does not return an inactive profile through the owner query", async () => {
    expect(await findStudentDetail(env.DB, "student-b", "user-b")).toBeNull();
  });

  it("locks NIM after attendance exists", async () => {
    await seedAttendance();

    await expect(
      editStudent(env.DB, "admin", "student-a", {
        nim: "009",
        fullName: "Budi Santoso",
        phone: "081234",
        notes: "Koordinator",
      }),
    ).rejects.toMatchObject({ code: "NIM_LOCKED_BY_ATTENDANCE", status: 409 });
  });

  it("deactivates an account without deleting attendance history", async () => {
    await seedAttendance();
    await changeStudentStatus(env.DB, "admin", "student-a", {
      isActive: false,
      reason: "Tidak lagi mengikuti kegiatan",
    });
    const account = await env.DB.prepare(
      "SELECT is_active, banned FROM user WHERE id = 'user-a'",
    ).first<{ is_active: number; banned: number }>();
    const attendance = await env.DB.prepare(
      "SELECT count(*) AS total FROM attendance_records WHERE student_id = 'student-a'",
    ).first<{ total: number }>();

    expect(account).toEqual({ is_active: 0, banned: 1 });
    expect(attendance?.total).toBe(1);
  });
});

describe("Phase 2 CSV import", () => {
  it("parses quoted commas and flags every duplicate NIM", () => {
    const rows = analyzeStudentCsv(
      'nim,nama,telepon\n003,"Dewi, Lestari",0812\n003,Dewi Lestari,0813',
    );

    expect(rows[0].fullName).toBe("Dewi, Lestari");
    expect(
      rows.every((row) =>
        row.errors.includes("NIM muncul lebih dari sekali di CSV."),
      ),
    ).toBe(true);
  });

  it("rejects malformed quoted CSV", () => {
    expect(() => parseCsv('nim,nama\n003,"Nama')).toThrow(
      "Tanda kutip CSV belum ditutup.",
    );
  });

  it("generates a temporary password with letters and numbers", () => {
    const password = generateTemporaryPassword();
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[A-Za-z]/);
    expect(password).toMatch(/[0-9]/);
  });
});
