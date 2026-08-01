import { desc, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
};

export const groupSettings = sqliteTable(
  "group_settings",
  {
    id: text("id").primaryKey(),
    name: text("name").default("KKN Desa Kuncir 2026").notNull(),
    village: text("village"),
    district: text("district"),
    regency: text("regency"),
    address: text("address"),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    timezone: text("timezone").default("Asia/Jakarta").notNull(),
    dailyAutoCreate: integer("daily_auto_create", { mode: "boolean" })
      .default(false)
      .notNull(),
    dailyStartTime: text("daily_start_time").notNull(),
    dailyEndTime: text("daily_end_time").notNull(),
    dailyLateTime: text("daily_late_time"),
    dailyDefaultMode: text("daily_default_mode").default("SELF_SCAN").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    ...timestamps,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check(
      "ck_group_settings_period",
      sql`${table.periodEnd} >= ${table.periodStart}`,
    ),
    check(
      "ck_group_settings_default_mode",
      sql`${table.dailyDefaultMode} IN ('SELF_SCAN', 'ADMIN_SCAN', 'HYBRID')`,
    ),
    uniqueIndex("ux_group_settings_single_active")
      .on(table.isActive)
      .where(sql`${table.isActive} = 1`),
  ],
);

export const students = sqliteTable(
  "students",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groupSettings.id, { onDelete: "restrict" }),
    nim: text("nim").notNull(),
    phone: text("phone"),
    notes: text("notes"),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("ux_students_user_id").on(table.userId),
    uniqueIndex("ux_students_nim_active")
      .on(table.nim)
      .where(sql`${table.deletedAt} IS NULL`),
    index("ix_students_group_id").on(table.groupId),
  ],
);

export const qrCredentials = sqliteTable(
  "qr_credentials",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    version: integer("version").default(1).notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    rotatedAt: integer("rotated_at", { mode: "timestamp_ms" }),
    ...timestamps,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("ux_qr_credentials_token_hash").on(table.tokenHash),
    uniqueIndex("ux_qr_credentials_student_active")
      .on(table.studentId)
      .where(sql`${table.isActive} = 1`),
    check("ck_qr_credentials_version", sql`${table.version} >= 1`),
  ],
);

export const attendanceSessions = sqliteTable(
  "attendance_sessions",
  {
    id: text("id").primaryKey(),
    sessionType: text("session_type").notNull(),
    title: text("title").notNull(),
    sessionDate: text("session_date").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    lateAfter: integer("late_after", { mode: "timestamp_ms" }),
    attendanceMode: text("attendance_mode").notNull(),
    status: text("status").default("DRAFT").notNull(),
    notes: text("notes"),
    qrVersion: integer("qr_version").default(1).notNull(),
    ...timestamps,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check(
      "ck_attendance_sessions_type",
      sql`${table.sessionType} IN ('DAILY', 'EVENT')`,
    ),
    check(
      "ck_attendance_sessions_mode",
      sql`${table.attendanceMode} IN ('SELF_SCAN', 'ADMIN_SCAN', 'HYBRID')`,
    ),
    check(
      "ck_attendance_sessions_status",
      sql`${table.status} IN ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED')`,
    ),
    check(
      "ck_attendance_sessions_time",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "ck_attendance_sessions_late",
      sql`${table.lateAfter} IS NULL OR (${table.lateAfter} >= ${table.startsAt} AND ${table.lateAfter} <= ${table.endsAt})`,
    ),
    check(
      "ck_attendance_sessions_title",
      sql`length(${table.title}) BETWEEN 1 AND 120`,
    ),
    check("ck_attendance_sessions_qr_version", sql`${table.qrVersion} >= 1`),
    uniqueIndex("ux_daily_session_date")
      .on(table.sessionDate)
      .where(
        sql`${table.sessionType} = 'DAILY' AND ${table.status} != 'CANCELLED'`,
      ),
    index("ix_sessions_date_status").on(table.sessionDate, table.status),
  ],
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "restrict" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    method: text("method").notNull(),
    recordedAt: integer("recorded_at", { mode: "timestamp_ms" }).notNull(),
    locationStatus: text("location_status").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    accuracyMeters: real("accuracy_meters"),
    locationCapturedAt: integer("location_captured_at", {
      mode: "timestamp_ms",
    }),
    idempotencyKey: text("idempotency_key"),
    revision: integer("revision").default(1).notNull(),
    ...timestamps,
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check(
      "ck_attendance_records_status",
      sql`${table.status} IN ('PRESENT', 'LATE', 'SICK', 'PERMITTED', 'ABSENT')`,
    ),
    check(
      "ck_attendance_records_method",
      sql`${table.method} IN ('SELF_SCAN', 'ADMIN_SCAN', 'MANUAL')`,
    ),
    check(
      "ck_attendance_records_location_status",
      sql`${table.locationStatus} IN ('CAPTURED', 'NOT_REQUIRED', 'UNAVAILABLE')`,
    ),
    check("ck_attendance_records_revision", sql`${table.revision} >= 1`),
    check(
      "ck_attendance_records_latitude",
      sql`${table.latitude} IS NULL OR ${table.latitude} BETWEEN -90 AND 90`,
    ),
    check(
      "ck_attendance_records_longitude",
      sql`${table.longitude} IS NULL OR ${table.longitude} BETWEEN -180 AND 180`,
    ),
    check(
      "ck_attendance_records_accuracy",
      sql`${table.accuracyMeters} IS NULL OR ${table.accuracyMeters} >= 0`,
    ),
    check(
      "ck_attendance_records_location_payload",
      sql`(${table.locationStatus} = 'CAPTURED' AND ${table.latitude} IS NOT NULL AND ${table.longitude} IS NOT NULL AND ${table.locationCapturedAt} IS NOT NULL) OR (${table.locationStatus} != 'CAPTURED' AND ${table.latitude} IS NULL AND ${table.longitude} IS NULL AND ${table.accuracyMeters} IS NULL AND ${table.locationCapturedAt} IS NULL)`,
    ),
    uniqueIndex("ux_attendance_session_student").on(
      table.sessionId,
      table.studentId,
    ),
    uniqueIndex("ux_attendance_idempotency")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("ix_records_student_recorded").on(
      table.studentId,
      desc(table.recordedAt),
    ),
    index("ix_records_session_status").on(table.sessionId, table.status),
  ],
);

export const attendanceAudits = sqliteTable(
  "attendance_audits",
  {
    id: text("id").primaryKey(),
    attendanceId: text("attendance_id")
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    oldValues: text("old_values"),
    newValues: text("new_values").notNull(),
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    check(
      "ck_attendance_audits_action",
      sql`${table.action} IN ('CREATE', 'MANUAL_CREATE', 'STATUS_CHANGE')`,
    ),
    check(
      "ck_attendance_audits_reason",
      sql`${table.action} = 'CREATE' OR (${table.reason} IS NOT NULL AND length(trim(${table.reason})) > 0)`,
    ),
    index("ix_audits_attendance_created").on(
      table.attendanceId,
      desc(table.createdAt),
    ),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("ix_audit_logs_entity_created").on(
      table.entityType,
      table.entityId,
      desc(table.createdAt),
    ),
    index("ix_audit_logs_actor_created").on(
      table.createdBy,
      desc(table.createdAt),
    ),
  ],
);
