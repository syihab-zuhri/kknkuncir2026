import {
  businessDateTimeToEpoch,
  BUSINESS_TIME_ZONE,
  formatBusinessDate,
  getBusinessDate,
} from "@/lib/time/business-time";

import { SessionServiceError } from "./errors";
import {
  closeExpiredSessionRows,
  findActiveSessions,
  findSchedulerGroup,
  findSessionById,
  findSessionForActor,
  getSessionSummary,
  insertDailySessionIfMissing,
  insertSession,
  listSessions,
  transitionSessionRow,
  updateSessionRow,
  type PersistedSessionInput,
  type SessionActorScope,
} from "./repository";
import {
  cancelSessionSchema,
  sessionInputSchema,
  sessionListQuerySchema,
  type AttendanceSessionDto,
  type SessionInput,
} from "./schema";

export async function getSessions(
  binding: D1Database,
  searchParams: URLSearchParams,
  scope: SessionActorScope,
  now = Date.now(),
) {
  const query = sessionListQuerySchema.parse({
    date: searchParams.get("date") || undefined,
    type: searchParams.get("type") || undefined,
    status: searchParams.get("status") || undefined,
  });
  return { items: await listSessions(binding, query, scope, now) };
}

export async function getSessionDetail(
  binding: D1Database,
  id: string,
  scope: SessionActorScope,
  now = Date.now(),
) {
  const session = await findSessionForActor(binding, id, scope, now);
  if (!session) throw notFound();

  return {
    session,
    summary: await getSessionSummary(binding, session.id),
  };
}

export async function getActiveSessionCards(
  binding: D1Database,
  now = Date.now(),
) {
  const sessions = await findActiveSessions(binding, now);
  return {
    daily: sessions.find((session) => session.sessionType === "DAILY") ?? null,
    events: sessions.filter((session) => session.sessionType === "EVENT"),
  };
}

export async function createSession(
  binding: D1Database,
  actorUserId: string,
  payload: unknown,
): Promise<AttendanceSessionDto> {
  const input = sessionInputSchema.parse(payload);
  try {
    return await insertSession(
      binding,
      actorUserId,
      toPersistedSessionInput(input),
    );
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function editSession(
  binding: D1Database,
  actorUserId: string,
  id: string,
  payload: unknown,
): Promise<AttendanceSessionDto> {
  const input = sessionInputSchema.parse(payload);
  const current = await requireSessionById(binding, id);
  const next = toPersistedSessionInput(input);

  if (current.status === "CLOSED" || current.status === "CANCELLED") {
    throw new SessionServiceError(
      409,
      "SESSION_NOT_EDITABLE",
      "Sesi yang sudah selesai atau dibatalkan tidak dapat diubah.",
    );
  }

  if (
    current.status === "OPEN" &&
    (current.sessionType !== next.sessionType ||
      current.sessionDate !== next.sessionDate ||
      current.startsAt !== next.startsAt ||
      current.endsAt !== next.endsAt ||
      current.lateAfter !== next.lateAfter)
  ) {
    throw new SessionServiceError(
      409,
      "OPEN_SESSION_TIME_LOCKED",
      "Tanggal dan waktu sesi aktif tidak dapat diubah.",
    );
  }

  const changedFields = getChangedFields(current, next);
  if (changedFields.length === 0) return current;

  try {
    return await updateSessionRow(
      binding,
      actorUserId,
      current,
      next,
      changedFields,
    );
  } catch (error) {
    throw mapWriteError(error);
  }
}

export async function openSession(
  binding: D1Database,
  actorUserId: string,
  id: string,
  now = Date.now(),
): Promise<AttendanceSessionDto> {
  const current = await requireSessionById(binding, id);
  if (current.status === "OPEN") return current;
  if (current.status !== "DRAFT") throw invalidTransition();
  if (now >= current.endsAt) {
    throw new SessionServiceError(
      409,
      "SESSION_EXPIRED",
      "Sesi tidak dapat dibuka karena waktunya telah berakhir.",
    );
  }
  return transitionSessionRow(
    binding,
    actorUserId,
    current,
    "OPEN",
    "SESSION_OPENED",
  );
}

export async function closeSession(
  binding: D1Database,
  actorUserId: string,
  id: string,
): Promise<AttendanceSessionDto> {
  const current = await requireSessionById(binding, id);
  if (current.status === "CLOSED") return current;
  if (current.status !== "OPEN") throw invalidTransition();
  return transitionSessionRow(
    binding,
    actorUserId,
    current,
    "CLOSED",
    "SESSION_CLOSED",
    { reason: "ADMIN_EARLY_CLOSE" },
  );
}

export async function cancelSession(
  binding: D1Database,
  actorUserId: string,
  id: string,
  payload: unknown,
): Promise<AttendanceSessionDto> {
  const { reason } = cancelSessionSchema.parse(payload);
  const current = await requireSessionById(binding, id);
  if (current.status === "CANCELLED") return current;
  if (current.status !== "DRAFT" && current.status !== "OPEN") {
    throw invalidTransition();
  }
  return transitionSessionRow(
    binding,
    actorUserId,
    current,
    "CANCELLED",
    "SESSION_CANCELLED",
    { reason },
  );
}

export type AttendanceSchedulerResult = {
  businessDate: string;
  dailyCreated: boolean;
  expiredClosed: number;
  autoCreateEnabled: boolean;
  insidePeriod: boolean;
};

export async function runAttendanceScheduler(
  binding: D1Database,
  scheduledTime: number,
): Promise<AttendanceSchedulerResult> {
  const group = await findSchedulerGroup(binding);
  if (!group) {
    throw new Error("SCHEDULER_ACTIVE_GROUP_NOT_FOUND");
  }
  if (group.timezone !== BUSINESS_TIME_ZONE) {
    throw new Error("SCHEDULER_UNSUPPORTED_TIMEZONE");
  }

  const businessDate = getBusinessDate(scheduledTime);
  const insidePeriod =
    businessDate >= group.periodStart && businessDate <= group.periodEnd;
  let dailyCreated = false;

  if (group.dailyAutoCreate && insidePeriod) {
    const input: PersistedSessionInput = {
      sessionType: "DAILY",
      title: `Absensi Harian ${formatBusinessDate(businessDate)}`,
      sessionDate: businessDate,
      startsAt: businessDateTimeToEpoch(businessDate, group.dailyStartTime),
      endsAt: businessDateTimeToEpoch(businessDate, group.dailyEndTime),
      lateAfter: group.dailyLateTime
        ? businessDateTimeToEpoch(businessDate, group.dailyLateTime)
        : null,
      attendanceMode: group.dailyDefaultMode,
      notes: null,
    };
    dailyCreated = await insertDailySessionIfMissing(
      binding,
      group.actorUserId,
      input,
      scheduledTime,
    );
  }

  const expiredClosed = await closeExpiredSessionRows(
    binding,
    group.actorUserId,
    scheduledTime,
  );

  return {
    businessDate,
    dailyCreated,
    expiredClosed,
    autoCreateEnabled: group.dailyAutoCreate,
    insidePeriod,
  };
}

function toPersistedSessionInput(input: SessionInput): PersistedSessionInput {
  return {
    sessionType: input.sessionType,
    title:
      input.title || `Absensi Harian ${formatBusinessDate(input.sessionDate)}`,
    sessionDate: input.sessionDate,
    startsAt: businessDateTimeToEpoch(input.sessionDate, input.startTime),
    endsAt: businessDateTimeToEpoch(input.sessionDate, input.endTime),
    lateAfter: input.lateTime
      ? businessDateTimeToEpoch(input.sessionDate, input.lateTime)
      : null,
    attendanceMode: input.attendanceMode,
    notes: input.notes,
  };
}

async function requireSessionById(binding: D1Database, id: string) {
  const session = await findSessionById(binding, id);
  if (!session) throw notFound();
  return session;
}

function getChangedFields(
  current: AttendanceSessionDto,
  next: PersistedSessionInput,
): string[] {
  const fields: (keyof PersistedSessionInput)[] = [
    "sessionType",
    "title",
    "sessionDate",
    "startsAt",
    "endsAt",
    "lateAfter",
    "attendanceMode",
    "notes",
  ];
  return fields.filter((field) => current[field] !== next[field]);
}

function mapWriteError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("ux_daily_session_date") ||
    message.includes("attendance_sessions.session_date")
  ) {
    return new SessionServiceError(
      409,
      "DAILY_SESSION_EXISTS",
      "Absensi harian untuk tanggal ini sudah tersedia.",
    );
  }
  if (message === "SESSION_UPDATE_CONFLICT") {
    return new SessionServiceError(
      409,
      "SESSION_UPDATE_CONFLICT",
      "Sesi berubah. Muat ulang lalu coba lagi.",
    );
  }
  return error instanceof Error ? error : new Error(message);
}

function notFound() {
  return new SessionServiceError(
    404,
    "SESSION_NOT_FOUND",
    "Sesi tidak ditemukan.",
  );
}

function invalidTransition() {
  return new SessionServiceError(
    409,
    "SESSION_INVALID_TRANSITION",
    "Status sesi tidak mendukung tindakan ini.",
  );
}
