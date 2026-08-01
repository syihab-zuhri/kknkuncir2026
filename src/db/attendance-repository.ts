export type AttendanceCorrection = {
  attendanceId: string;
  expectedRevision: number;
  status: "PRESENT" | "LATE" | "SICK" | "PERMITTED" | "ABSENT";
  reason: string;
  actorUserId: string;
  oldValues: string;
  newValues: string;
};

export async function correctAttendanceAtomically(
  database: D1Database,
  correction: AttendanceCorrection,
): Promise<number> {
  const nextRevision = correction.expectedRevision + 1;
  const mutationTime = Date.now();
  const auditId = crypto.randomUUID();

  const [updateResult, auditResult] = await database.batch([
    database
      .prepare(
        `UPDATE attendance_records
         SET status = ?, revision = ?, updated_at = ?, updated_by = ?
         WHERE id = ? AND revision = ?`,
      )
      .bind(
        correction.status,
        nextRevision,
        mutationTime,
        correction.actorUserId,
        correction.attendanceId,
        correction.expectedRevision,
      ),
    database
      .prepare(
        `INSERT INTO attendance_audits (
           id, attendance_id, action, old_values, new_values,
           reason, created_at, created_by
         )
         SELECT ?, id, 'STATUS_CHANGE', ?, ?, ?, ?, ?
         FROM attendance_records
         WHERE id = ? AND revision = ? AND updated_at = ? AND updated_by = ?`,
      )
      .bind(
        auditId,
        correction.oldValues,
        correction.newValues,
        correction.reason,
        mutationTime,
        correction.actorUserId,
        correction.attendanceId,
        nextRevision,
        mutationTime,
        correction.actorUserId,
      ),
  ]);

  if (updateResult.meta.changes !== 1 || auditResult.meta.changes !== 1) {
    throw new Error("ATTENDANCE_REVISION_CONFLICT");
  }

  return nextRevision;
}
