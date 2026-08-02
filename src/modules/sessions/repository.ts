import type {
  AttendanceSessionDto,
  SessionAttendanceMode,
  SessionListQuery,
  SessionStatus,
  SessionSummary,
  SessionType,
} from "./schema";

type SessionRow = {
  id: string;
  session_type: string;
  title: string;
  session_date: string;
  starts_at: number;
  ends_at: number;
  late_after: number | null;
  attendance_mode: string;
  status: string;
  notes: string | null;
  qr_version: number;
  attendance_total: number;
  created_at: number;
  updated_at: number;
};

export type PersistedSessionInput = {
  sessionType: SessionType;
  title: string;
  sessionDate: string;
  startsAt: number;
  endsAt: number;
  lateAfter: number | null;
  attendanceMode: SessionAttendanceMode;
  notes: string | null;
};

export type SessionActorScope =
  { role: "ADMIN" } | { role: "STUDENT"; studentId: string };

export type SchedulerGroup = {
  periodStart: string;
  periodEnd: string;
  timezone: string;
  dailyAutoCreate: boolean;
  dailyStartTime: string;
  dailyEndTime: string;
  dailyLateTime: string | null;
  dailyDefaultMode: SessionAttendanceMode;
  actorUserId: string;
};

const sessionSelect = `
  SELECT s.id, s.session_type, s.title, s.session_date, s.starts_at,
         s.ends_at, s.late_after, s.attendance_mode, s.status, s.notes,
         s.qr_version, s.created_at, s.updated_at,
         (SELECT count(*) FROM attendance_records ar WHERE ar.session_id = s.id)
           AS attendance_total
  FROM attendance_sessions s`;

export async function insertSession(
  binding: D1Database,
  actorUserId: string,
  input: PersistedSessionInput,
): Promise<AttendanceSessionDto> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const [insert, audit] = await binding.batch([
    binding
      .prepare(
        `INSERT INTO attendance_sessions
         (id, session_type, title, session_date, starts_at, ends_at,
          late_after, attendance_mode, status, notes, qr_version,
          created_at, updated_at, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, 1, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.sessionType,
        input.title,
        input.sessionDate,
        input.startsAt,
        input.endsAt,
        input.lateAfter,
        input.attendanceMode,
        input.notes,
        now,
        now,
        actorUserId,
        actorUserId,
      ),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         SELECT ?, 'SESSION_CREATED', 'attendance_session', id, ?, ?, ?
         FROM attendance_sessions WHERE id = ?`,
      )
      .bind(
        crypto.randomUUID(),
        JSON.stringify({ sessionType: input.sessionType }),
        now,
        actorUserId,
        id,
      ),
  ]);

  if (insert.meta.changes !== 1 || audit.meta.changes !== 1) {
    throw new Error("SESSION_CREATE_NOT_APPLIED");
  }

  return (await findSessionById(binding, id))!;
}

export async function findSessionById(
  binding: D1Database,
  id: string,
): Promise<AttendanceSessionDto | null> {
  const row = await binding
    .prepare(`${sessionSelect} WHERE s.id = ?`)
    .bind(id)
    .first<SessionRow>();
  return row ? toSessionDto(row) : null;
}

export async function findSessionForActor(
  binding: D1Database,
  id: string,
  scope: SessionActorScope,
  now: number,
): Promise<AttendanceSessionDto | null> {
  if (scope.role === "ADMIN") return findSessionById(binding, id);

  const row = await binding
    .prepare(
      `${sessionSelect}
       WHERE s.id = ? AND (
         (s.status = 'OPEN' AND s.starts_at <= ? AND s.ends_at > ?)
         OR EXISTS (
           SELECT 1 FROM attendance_records owned
           WHERE owned.session_id = s.id AND owned.student_id = ?
         )
       )`,
    )
    .bind(id, now, now, scope.studentId)
    .first<SessionRow>();
  return row ? toSessionDto(row) : null;
}

export async function listSessions(
  binding: D1Database,
  query: SessionListQuery,
  scope: SessionActorScope,
  now: number,
): Promise<AttendanceSessionDto[]> {
  const clauses: string[] = [];
  const values: (string | number)[] = [];

  if (query.date) {
    clauses.push("s.session_date = ?");
    values.push(query.date);
  }
  if (query.type !== "all") {
    clauses.push("s.session_type = ?");
    values.push(query.type);
  }
  if (query.status !== "all") {
    clauses.push("s.status = ?");
    values.push(query.status);
  }
  if (scope.role === "STUDENT") {
    clauses.push(`(
      (s.status = 'OPEN' AND s.starts_at <= ? AND s.ends_at > ?)
      OR EXISTS (
        SELECT 1 FROM attendance_records owned
        WHERE owned.session_id = s.id AND owned.student_id = ?
      )
    )`);
    values.push(now, now, scope.studentId);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await binding
    .prepare(
      `${sessionSelect} ${where}
       ORDER BY s.session_date DESC, s.starts_at DESC
       LIMIT 100`,
    )
    .bind(...values)
    .all<SessionRow>();
  return result.results.map(toSessionDto);
}

export async function findActiveSessions(
  binding: D1Database,
  now: number,
): Promise<AttendanceSessionDto[]> {
  const result = await binding
    .prepare(
      `${sessionSelect}
       WHERE s.status = 'OPEN' AND s.starts_at <= ? AND s.ends_at > ?
       ORDER BY CASE s.session_type WHEN 'DAILY' THEN 0 ELSE 1 END, s.starts_at`,
    )
    .bind(now, now)
    .all<SessionRow>();
  return result.results.map(toSessionDto);
}

export async function getSessionSummary(
  binding: D1Database,
  sessionId: string,
): Promise<SessionSummary> {
  const rows = await binding
    .prepare(
      `SELECT status, count(*) AS total
       FROM attendance_records WHERE session_id = ? GROUP BY status`,
    )
    .bind(sessionId)
    .all<{ status: string; total: number }>();
  const summary: SessionSummary = {
    total: 0,
    present: 0,
    late: 0,
    sick: 0,
    permitted: 0,
    absent: 0,
  };

  for (const row of rows.results) {
    summary.total += row.total;
    if (row.status === "PRESENT") summary.present = row.total;
    if (row.status === "LATE") summary.late = row.total;
    if (row.status === "SICK") summary.sick = row.total;
    if (row.status === "PERMITTED") summary.permitted = row.total;
    if (row.status === "ABSENT") summary.absent = row.total;
  }
  return summary;
}

export async function updateSessionRow(
  binding: D1Database,
  actorUserId: string,
  current: AttendanceSessionDto,
  input: PersistedSessionInput,
  changedFields: string[],
): Promise<AttendanceSessionDto> {
  const now = Date.now();
  const [update, audit] = await binding.batch([
    binding
      .prepare(
        `UPDATE attendance_sessions
         SET session_type = ?, title = ?, session_date = ?, starts_at = ?,
             ends_at = ?, late_after = ?, attendance_mode = ?, notes = ?,
             updated_at = ?, updated_by = ?
         WHERE id = ? AND status = ? AND updated_at = ?`,
      )
      .bind(
        input.sessionType,
        input.title,
        input.sessionDate,
        input.startsAt,
        input.endsAt,
        input.lateAfter,
        input.attendanceMode,
        input.notes,
        now,
        actorUserId,
        current.id,
        current.status,
        current.updatedAt,
      ),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         SELECT ?, 'SESSION_UPDATED', 'attendance_session', id, ?, ?, ?
         FROM attendance_sessions
         WHERE id = ? AND updated_at = ? AND updated_by = ?`,
      )
      .bind(
        crypto.randomUUID(),
        JSON.stringify({
          changedFields,
          hadAttendance: current.attendanceTotal > 0,
        }),
        now,
        actorUserId,
        current.id,
        now,
        actorUserId,
      ),
  ]);

  if (update.meta.changes !== 1 || audit.meta.changes !== 1) {
    throw new Error("SESSION_UPDATE_CONFLICT");
  }
  return (await findSessionById(binding, current.id))!;
}

export async function transitionSessionRow(
  binding: D1Database,
  actorUserId: string,
  current: AttendanceSessionDto,
  target: SessionStatus,
  action: string,
  metadata: Record<string, unknown> = {},
): Promise<AttendanceSessionDto> {
  const now = Date.now();
  const [update, audit] = await binding.batch([
    binding
      .prepare(
        `UPDATE attendance_sessions
         SET status = ?, updated_at = ?, updated_by = ?
         WHERE id = ? AND status = ? AND updated_at = ?`,
      )
      .bind(
        target,
        now,
        actorUserId,
        current.id,
        current.status,
        current.updatedAt,
      ),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         SELECT ?, ?, 'attendance_session', id, ?, ?, ?
         FROM attendance_sessions
         WHERE id = ? AND status = ? AND updated_at = ? AND updated_by = ?`,
      )
      .bind(
        crypto.randomUUID(),
        action,
        JSON.stringify({ from: current.status, to: target, ...metadata }),
        now,
        actorUserId,
        current.id,
        target,
        now,
        actorUserId,
      ),
  ]);

  if (update.meta.changes !== 1 || audit.meta.changes !== 1) {
    throw new Error("SESSION_UPDATE_CONFLICT");
  }
  return (await findSessionById(binding, current.id))!;
}

export async function findSchedulerGroup(
  binding: D1Database,
): Promise<SchedulerGroup | null> {
  const row = await binding
    .prepare(
      `SELECT period_start, period_end, timezone, daily_auto_create,
              daily_start_time, daily_end_time, daily_late_time,
              daily_default_mode, updated_by
       FROM group_settings WHERE is_active = 1`,
    )
    .first<{
      period_start: string;
      period_end: string;
      timezone: string;
      daily_auto_create: number;
      daily_start_time: string;
      daily_end_time: string;
      daily_late_time: string | null;
      daily_default_mode: string;
      updated_by: string;
    }>();

  return row
    ? {
        periodStart: row.period_start,
        periodEnd: row.period_end,
        timezone: row.timezone,
        dailyAutoCreate: row.daily_auto_create === 1,
        dailyStartTime: row.daily_start_time,
        dailyEndTime: row.daily_end_time,
        dailyLateTime: row.daily_late_time,
        dailyDefaultMode: row.daily_default_mode as SessionAttendanceMode,
        actorUserId: row.updated_by,
      }
    : null;
}

export async function insertDailySessionIfMissing(
  binding: D1Database,
  actorUserId: string,
  input: PersistedSessionInput,
  now: number,
): Promise<boolean> {
  const id = crypto.randomUUID();
  const [insert, audit] = await binding.batch([
    binding
      .prepare(
        `INSERT INTO attendance_sessions
         (id, session_type, title, session_date, starts_at, ends_at,
          late_after, attendance_mode, status, notes, qr_version,
          created_at, updated_at, created_by, updated_by)
         SELECT ?, 'DAILY', ?, ?, ?, ?, ?, ?, 'DRAFT', NULL, 1, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM attendance_sessions
           WHERE session_type = 'DAILY' AND session_date = ?
             AND status != 'CANCELLED'
         )`,
      )
      .bind(
        id,
        input.title,
        input.sessionDate,
        input.startsAt,
        input.endsAt,
        input.lateAfter,
        input.attendanceMode,
        now,
        now,
        actorUserId,
        actorUserId,
        input.sessionDate,
      ),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         SELECT ?, 'SESSION_AUTO_CREATED', 'attendance_session', id, ?, ?, ?
         FROM attendance_sessions WHERE id = ?`,
      )
      .bind(
        crypto.randomUUID(),
        JSON.stringify({ sessionDate: input.sessionDate }),
        now,
        actorUserId,
        id,
      ),
  ]);

  if (insert.meta.changes !== audit.meta.changes) {
    throw new Error("SESSION_AUTO_CREATE_AUDIT_MISMATCH");
  }
  return insert.meta.changes === 1;
}

export async function closeExpiredSessionRows(
  binding: D1Database,
  actorUserId: string,
  now: number,
): Promise<number> {
  const expired = await binding
    .prepare(
      `SELECT id, updated_at FROM attendance_sessions
       WHERE status = 'OPEN' AND ends_at <= ?
       ORDER BY ends_at LIMIT 100`,
    )
    .bind(now)
    .all<{ id: string; updated_at: number }>();

  let closed = 0;
  for (let offset = 0; offset < expired.results.length; offset += 25) {
    const chunk = expired.results.slice(offset, offset + 25);
    const statements: D1PreparedStatement[] = [];
    for (const session of chunk) {
      statements.push(
        binding
          .prepare(
            `UPDATE attendance_sessions SET status = 'CLOSED', updated_at = ?, updated_by = ?
             WHERE id = ? AND status = 'OPEN' AND updated_at = ?`,
          )
          .bind(now, actorUserId, session.id, session.updated_at),
        binding
          .prepare(
            `INSERT INTO audit_logs
             (id, action, entity_type, entity_id, metadata, created_at, created_by)
             SELECT ?, 'SESSION_AUTO_CLOSED', 'attendance_session', id, ?, ?, ?
             FROM attendance_sessions
             WHERE id = ? AND status = 'CLOSED' AND updated_at = ? AND updated_by = ?`,
          )
          .bind(
            crypto.randomUUID(),
            JSON.stringify({ reason: "END_TIME_REACHED" }),
            now,
            actorUserId,
            session.id,
            now,
            actorUserId,
          ),
      );
    }
    const results = await binding.batch(statements);
    for (let index = 0; index < results.length; index += 2) {
      const updateChanges = results[index]?.meta.changes ?? 0;
      const auditChanges = results[index + 1]?.meta.changes ?? 0;
      if (updateChanges !== auditChanges) {
        throw new Error("SESSION_AUTO_CLOSE_AUDIT_MISMATCH");
      }
      closed += updateChanges;
    }
  }
  return closed;
}

function toSessionDto(row: SessionRow): AttendanceSessionDto {
  return {
    id: row.id,
    sessionType: row.session_type as SessionType,
    title: row.title,
    sessionDate: row.session_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    lateAfter: row.late_after,
    attendanceMode: row.attendance_mode as SessionAttendanceMode,
    status: row.status as SessionStatus,
    notes: row.notes,
    qrVersion: row.qr_version,
    attendanceTotal: row.attendance_total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
