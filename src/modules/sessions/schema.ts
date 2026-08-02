import { z } from "zod";

import {
  isBusinessClock,
  isIsoDate,
  normalizeBusinessClock,
} from "@/lib/time/business-time";

export const sessionTypeSchema = z.enum(["DAILY", "EVENT"]);
export const sessionStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "CLOSED",
  "CANCELLED",
]);
export const sessionAttendanceModeSchema = z.enum([
  "SELF_SCAN",
  "ADMIN_SCAN",
  "HYBRID",
]);

const isoDateSchema = z
  .string()
  .refine(isIsoDate, "Tanggal harus valid dengan format YYYY-MM-DD.");
const clockSchema = z
  .string()
  .refine(isBusinessClock, "Waktu harus valid dengan format HH:mm.")
  .transform(normalizeBusinessClock);

export const sessionInputSchema = z
  .object({
    sessionType: sessionTypeSchema,
    title: z.string().trim().max(120).optional().default(""),
    sessionDate: isoDateSchema,
    startTime: clockSchema,
    endTime: clockSchema,
    lateTime: z
      .union([clockSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => (value ? normalizeBusinessClock(value) : null)),
    attendanceMode: sessionAttendanceModeSchema,
    notes: z
      .union([z.string().trim().max(1_000), z.null()])
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .superRefine((value, context) => {
    if (value.sessionType === "EVENT" && value.title.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["title"],
        message: "Nama kegiatan wajib diisi.",
      });
    }

    if (value.endTime <= value.startTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Waktu selesai harus setelah waktu mulai.",
      });
    }

    if (
      value.lateTime &&
      (value.lateTime < value.startTime || value.lateTime > value.endTime)
    ) {
      context.addIssue({
        code: "custom",
        path: ["lateTime"],
        message: "Batas terlambat harus berada di antara waktu sesi.",
      });
    }
  });

export const sessionListQuerySchema = z.object({
  date: isoDateSchema.optional(),
  type: z.union([sessionTypeSchema, z.literal("all")]).default("all"),
  status: z.union([sessionStatusSchema, z.literal("all")]).default("all"),
});

export const cancelSessionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type SessionInput = z.infer<typeof sessionInputSchema>;
export type SessionType = z.infer<typeof sessionTypeSchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;
export type SessionAttendanceMode = z.infer<typeof sessionAttendanceModeSchema>;
export type SessionListQuery = z.infer<typeof sessionListQuerySchema>;

export type AttendanceSessionDto = {
  id: string;
  sessionType: SessionType;
  title: string;
  sessionDate: string;
  startsAt: number;
  endsAt: number;
  lateAfter: number | null;
  attendanceMode: SessionAttendanceMode;
  status: SessionStatus;
  notes: string | null;
  qrVersion: number;
  attendanceTotal: number;
  createdAt: number;
  updatedAt: number;
};

export type SessionSummary = {
  total: number;
  present: number;
  late: number;
  sick: number;
  permitted: number;
  absent: number;
};
