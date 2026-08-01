import type {
  StudentDetailDto,
  StudentListDto,
  StudentListQuery,
  StudentStatusInput,
  StudentSummaryDto,
  UpdateStudentInput,
} from "./schema";

type StudentQueryRow = {
  id: string;
  user_id: string;
  nim: string;
  full_name: string;
  phone: string | null;
  notes?: string | null;
  is_active: number;
  must_change_password: number;
  group_id: string;
  group_name: string;
  village?: string | null;
  period_start?: string;
  period_end?: string;
  updated_at: number;
  has_attendance?: number;
};

export async function listStudents(
  binding: D1Database,
  query: StudentListQuery,
): Promise<StudentListDto> {
  const conditions = ["s.deleted_at IS NULL", "u.role = 'STUDENT'"];
  const parameters: Array<string | number> = [];

  if (query.q) {
    const pattern = `%${escapeLike(query.q.toLowerCase())}%`;
    conditions.push(
      "(lower(u.name) LIKE ? ESCAPE '\\' OR lower(s.nim) LIKE ? ESCAPE '\\')",
    );
    parameters.push(pattern, pattern);
  }
  if (query.status === "active") {
    conditions.push("u.is_active = 1 AND coalesce(u.banned, 0) = 0");
  } else if (query.status === "inactive") {
    conditions.push("(u.is_active = 0 OR coalesce(u.banned, 0) = 1)");
  }

  const where = conditions.join(" AND ");
  const offset = (query.page - 1) * query.pageSize;
  const [countResult, itemResult] = await binding.batch([
    binding
      .prepare(
        `SELECT count(*) AS total
         FROM students s
         INNER JOIN user u ON u.id = s.user_id
         WHERE ${where}`,
      )
      .bind(...parameters),
    binding
      .prepare(
        `SELECT s.id, s.user_id, s.nim, u.name AS full_name, s.phone,
                u.is_active, u.must_change_password, s.group_id,
                g.name AS group_name, s.updated_at
         FROM students s
         INNER JOIN user u ON u.id = s.user_id
         INNER JOIN group_settings g ON g.id = s.group_id
         WHERE ${where}
         ORDER BY u.name COLLATE NOCASE, s.nim
         LIMIT ? OFFSET ?`,
      )
      .bind(...parameters, query.pageSize, offset),
  ]);
  const countRow = countResult.results[0] as { total: number } | undefined;
  const total = Number(countRow?.total ?? 0);
  const items = (itemResult.results as StudentQueryRow[]).map(toStudentSummary);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function findStudentDetail(
  binding: D1Database,
  studentId: string,
  ownerUserId?: string,
): Promise<StudentDetailDto | null> {
  const ownership = ownerUserId
    ? "AND s.user_id = ? AND u.is_active = 1 AND coalesce(u.banned, 0) = 0"
    : "";
  const parameters = ownerUserId ? [studentId, ownerUserId] : [studentId];
  const row = await binding
    .prepare(
      `SELECT s.id, s.user_id, s.nim, u.name AS full_name, s.phone, s.notes,
              u.is_active, u.must_change_password, s.group_id,
              g.name AS group_name, g.village, g.period_start, g.period_end,
              s.updated_at,
              EXISTS(
                SELECT 1 FROM attendance_records ar
                WHERE ar.student_id = s.id LIMIT 1
              ) AS has_attendance
       FROM students s
       INNER JOIN user u ON u.id = s.user_id
       INNER JOIN group_settings g ON g.id = s.group_id
       WHERE s.id = ? ${ownership} AND s.deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(...parameters)
    .first<StudentQueryRow>();

  return row ? toStudentDetail(row) : null;
}

export async function findStudentByUserId(
  binding: D1Database,
  userId: string,
): Promise<StudentDetailDto | null> {
  const row = await binding
    .prepare(
      `SELECT s.id, s.user_id, s.nim, u.name AS full_name, s.phone, s.notes,
              u.is_active, u.must_change_password, s.group_id,
              g.name AS group_name, g.village, g.period_start, g.period_end,
              s.updated_at,
              EXISTS(
                SELECT 1 FROM attendance_records ar
                WHERE ar.student_id = s.id LIMIT 1
              ) AS has_attendance
       FROM students s
       INNER JOIN user u ON u.id = s.user_id
       INNER JOIN group_settings g ON g.id = s.group_id
       WHERE s.user_id = ? AND s.deleted_at IS NULL
         AND u.is_active = 1 AND coalesce(u.banned, 0) = 0
       LIMIT 1`,
    )
    .bind(userId)
    .first<StudentQueryRow>();

  return row ? toStudentDetail(row) : null;
}

export async function findExistingNims(
  binding: D1Database,
  nims: string[],
): Promise<Set<string>> {
  if (nims.length === 0) {
    return new Set();
  }

  const placeholders = nims.map(() => "?").join(", ");
  const result = await binding
    .prepare(
      `SELECT nim FROM students
       WHERE deleted_at IS NULL AND nim IN (${placeholders})`,
    )
    .bind(...nims)
    .all<{ nim: string }>();

  return new Set(result.results.map((row) => row.nim));
}

export async function updateStudentProfile(
  binding: D1Database,
  actorUserId: string,
  current: StudentDetailDto,
  input: UpdateStudentInput,
  normalizedNim: string,
  internalEmail: string,
): Promise<StudentDetailDto> {
  const now = Date.now();
  const [userUpdate, studentUpdate] = await binding.batch([
    binding
      .prepare(
        `UPDATE user
         SET name = ?, username = ?, display_username = ?, email = ?, updated_at = ?
         WHERE id = ? AND role = 'STUDENT'`,
      )
      .bind(
        input.fullName,
        normalizedNim,
        normalizedNim,
        internalEmail,
        now,
        current.userId,
      ),
    binding
      .prepare(
        `UPDATE students
         SET nim = ?, phone = ?, notes = ?, updated_at = ?, updated_by = ?
         WHERE id = ? AND deleted_at IS NULL`,
      )
      .bind(
        normalizedNim,
        input.phone,
        input.notes,
        now,
        actorUserId,
        current.id,
      ),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         SELECT ?, 'STUDENT_PROFILE_UPDATED', 'student', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM students
           WHERE id = ? AND updated_at = ? AND updated_by = ?
         )`,
      )
      .bind(
        crypto.randomUUID(),
        current.id,
        JSON.stringify({
          changedFields: ["fullName", "nim", "phone", "notes"],
        }),
        now,
        actorUserId,
        current.id,
        now,
        actorUserId,
      ),
  ]);

  if (
    (userUpdate.meta.changes ?? 0) !== 1 ||
    (studentUpdate.meta.changes ?? 0) !== 1
  ) {
    throw new Error("STUDENT_UPDATE_NOT_APPLIED");
  }

  return {
    ...current,
    nim: normalizedNim,
    fullName: input.fullName,
    phone: input.phone,
    notes: input.notes,
    updatedAt: now,
  };
}

export async function updateStudentStatus(
  binding: D1Database,
  actorUserId: string,
  current: StudentDetailDto,
  input: StudentStatusInput,
): Promise<void> {
  const now = Date.now();
  const statements = [
    binding
      .prepare(
        `UPDATE user
         SET is_active = ?, banned = ?, ban_reason = ?, updated_at = ?
         WHERE id = ? AND role = 'STUDENT'`,
      )
      .bind(
        input.isActive ? 1 : 0,
        input.isActive ? 0 : 1,
        input.isActive ? null : input.reason,
        now,
        current.userId,
      ),
    binding
      .prepare(
        "UPDATE students SET updated_at = ?, updated_by = ? WHERE id = ?",
      )
      .bind(now, actorUserId, current.id),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         VALUES (?, ?, 'student', ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.isActive ? "STUDENT_REACTIVATED" : "STUDENT_DEACTIVATED",
        current.id,
        JSON.stringify({
          userId: current.userId,
          reason: input.reason,
          sessionsRevoked: !input.isActive,
        }),
        now,
        actorUserId,
      ),
  ];

  if (!input.isActive) {
    statements.splice(
      1,
      0,
      binding
        .prepare("DELETE FROM session WHERE user_id = ?")
        .bind(current.userId),
    );
  }

  await binding.batch(statements);
}

function toStudentSummary(row: StudentQueryRow): StudentSummaryDto {
  return {
    id: row.id,
    userId: row.user_id,
    nim: row.nim,
    fullName: row.full_name,
    phone: row.phone,
    isActive: row.is_active === 1,
    mustChangePassword: row.must_change_password === 1,
    groupName: row.group_name,
    updatedAt: row.updated_at,
  };
}

function toStudentDetail(row: StudentQueryRow): StudentDetailDto {
  return {
    ...toStudentSummary(row),
    notes: row.notes ?? null,
    group: {
      id: row.group_id,
      name: row.group_name,
      village: row.village ?? null,
      periodStart: row.period_start ?? "",
      periodEnd: row.period_end ?? "",
    },
    nimEditable: row.has_attendance !== 1,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
