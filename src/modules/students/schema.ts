import { z } from "zod";

import { isValidNim } from "@/lib/auth/identity";
import { validatePassword } from "@/lib/auth/password-policy";

export const studentListQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["all", "active", "inactive"]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(10).max(50).catch(20),
});

export type StudentListQuery = z.infer<typeof studentListQuerySchema>;

const optionalText = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .optional()
    .transform((value) =>
      typeof value === "string" && value.length > 0 ? value : null,
    );

export const createStudentInputSchema = z
  .object({
    nim: z.string().trim().min(1).max(64),
    fullName: z.string().trim().min(2).max(120),
    temporaryPassword: z.string().min(10).max(128),
    phone: optionalText(30),
    notes: optionalText(1_000),
  })
  .superRefine((value, context) => {
    if (!isValidNim(value.nim)) {
      context.addIssue({
        code: "custom",
        path: ["nim"],
        message: "Format NIM tidak valid.",
      });
    }
    const passwordError = validatePassword(value.temporaryPassword);
    if (passwordError) {
      context.addIssue({
        code: "custom",
        path: ["temporaryPassword"],
        message: passwordError,
      });
    }
  });

export const updateStudentInputSchema = z
  .object({
    nim: z.string().trim().min(1).max(64),
    fullName: z.string().trim().min(2).max(120),
    phone: optionalText(30),
    notes: optionalText(1_000),
  })
  .superRefine((value, context) => {
    if (!isValidNim(value.nim)) {
      context.addIssue({
        code: "custom",
        path: ["nim"],
        message: "Format NIM tidak valid.",
      });
    }
  });

export const studentStatusInputSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(3).max(500),
});

export const studentImportInputSchema = z.object({
  csv: z.string().min(1).max(128_000),
  dryRun: z.boolean(),
});

export type CreateStudentInput = z.infer<typeof createStudentInputSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentInputSchema>;
export type StudentStatusInput = z.infer<typeof studentStatusInputSchema>;

export type StudentSummaryDto = {
  id: string;
  userId: string;
  nim: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  groupName: string;
  updatedAt: number;
};

export type StudentDetailDto = StudentSummaryDto & {
  notes: string | null;
  group: {
    id: string;
    name: string;
    village: string | null;
    periodStart: string;
    periodEnd: string;
  };
  nimEditable: boolean;
};

export type StudentListDto = {
  items: StudentSummaryDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type StudentImportRow = {
  row: number;
  nim: string;
  fullName: string;
  phone: string | null;
  errors: string[];
};

export type StudentImportResult = StudentImportRow & {
  status: "VALID" | "INVALID" | "CREATED" | "ERROR";
  studentId?: string;
  temporaryPassword?: string;
};
