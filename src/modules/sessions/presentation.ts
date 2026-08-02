import type {
  SessionAttendanceMode,
  SessionStatus,
  SessionType,
} from "./schema";

export const sessionStatusLabels: Record<SessionStatus, string> = {
  DRAFT: "Draf",
  OPEN: "Aktif",
  CLOSED: "Ditutup",
  CANCELLED: "Dibatalkan",
};

export const sessionTypeLabels: Record<SessionType, string> = {
  DAILY: "Harian",
  EVENT: "Kegiatan",
};

export const attendanceModeLabels: Record<SessionAttendanceMode, string> = {
  SELF_SCAN: "Mahasiswa scan sesi",
  ADMIN_SCAN: "Admin scan mahasiswa",
  HYBRID: "Keduanya",
};

export function sessionStatusClass(status: SessionStatus): string {
  if (status === "OPEN") return "status-pill status-active";
  if (status === "CANCELLED") return "status-pill status-inactive";
  if (status === "CLOSED") return "status-pill status-neutral";
  return "status-pill status-draft";
}
