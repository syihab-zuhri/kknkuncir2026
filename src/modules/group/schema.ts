import { z } from "zod";

export const attendanceModeSchema = z.enum([
  "SELF_SCAN",
  "ADMIN_SCAN",
  "HYBRID",
]);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus memakai format YYYY-MM-DD.")
  .refine(
    (value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().startsWith(value)
      );
    },
    { message: "Tanggal tidak valid." },
  );

const clockTimeSchema = z
  .string()
  .regex(
    /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
    "Waktu harus memakai format HH:mm.",
  );

function nullableText(maxLength: number) {
  return z
    .union([z.string().trim().max(maxLength), z.null()])
    .optional()
    .transform((value) =>
      typeof value === "string" && value.length > 0 ? value : null,
    );
}

export const groupSettingsInputSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    village: nullableText(100),
    district: nullableText(100),
    regency: nullableText(100),
    address: nullableText(500),
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
    dailyPolicy: z.object({
      autoCreate: z.boolean(),
      startTime: clockTimeSchema,
      endTime: clockTimeSchema,
      lateTime: z
        .union([clockTimeSchema, z.literal(""), z.null()])
        .optional()
        .transform((value) => (value ? normalizeClockTime(value) : null)),
      defaultMode: attendanceModeSchema,
    }),
  })
  .superRefine((value, context) => {
    if (value.periodEnd <= value.periodStart) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Tanggal selesai harus setelah tanggal mulai.",
      });
    }

    const start = normalizeClockTime(value.dailyPolicy.startTime);
    const end = normalizeClockTime(value.dailyPolicy.endTime);
    const late = value.dailyPolicy.lateTime;

    if (end <= start) {
      context.addIssue({
        code: "custom",
        path: ["dailyPolicy", "endTime"],
        message: "Jam selesai harus setelah jam mulai.",
      });
    }

    if (late && (late < start || late > end)) {
      context.addIssue({
        code: "custom",
        path: ["dailyPolicy", "lateTime"],
        message:
          "Batas terlambat harus berada di antara jam mulai dan selesai.",
      });
    }
  });

export type GroupSettingsInput = z.infer<typeof groupSettingsInputSchema>;

export type GroupSettingsDto = {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  regency: string | null;
  address: string | null;
  periodStart: string;
  periodEnd: string;
  timezone: "Asia/Jakarta";
  dailyPolicy: {
    autoCreate: boolean;
    startTime: string;
    endTime: string;
    lateTime: string | null;
    defaultMode: z.infer<typeof attendanceModeSchema>;
  };
  updatedAt: number;
};

export function normalizeClockTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}
