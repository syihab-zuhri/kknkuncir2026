import type { AppEnv } from "@/lib/cloudflare-env";
import { createAuth } from "@/lib/auth/server";
import { createInternalEmail, normalizeNim } from "@/lib/auth/identity";
import { getActiveGroup } from "@/modules/group/service";

import { analyzeStudentCsv } from "./csv";
import { CsvParseError, StudentServiceError } from "./errors";
import {
  findExistingNims,
  findStudentByUserId,
  findStudentDetail,
  listStudents,
  updateStudentProfile,
  updateStudentStatus,
} from "./repository";
import {
  createStudentInputSchema,
  studentImportInputSchema,
  studentListQuerySchema,
  studentStatusInputSchema,
  updateStudentInputSchema,
  type CreateStudentInput,
  type StudentDetailDto,
  type StudentImportResult,
} from "./schema";

export async function getStudents(
  binding: D1Database,
  params: URLSearchParams,
) {
  return listStudents(
    binding,
    studentListQuerySchema.parse({
      q: params.get("q") ?? "",
      status: params.get("status") ?? "all",
      page: params.get("page") ?? "1",
      pageSize: params.get("pageSize") ?? "20",
    }),
  );
}

export async function getStudentForActor(
  binding: D1Database,
  studentId: string,
  actor: { role: "ADMIN" | "STUDENT"; userId: string },
): Promise<StudentDetailDto> {
  const student = await findStudentDetail(
    binding,
    studentId,
    actor.role === "STUDENT" ? actor.userId : undefined,
  );

  if (!student) {
    throw new StudentServiceError(
      actor.role === "STUDENT" ? 403 : 404,
      actor.role === "STUDENT"
        ? "STUDENT_PROFILE_FORBIDDEN"
        : "STUDENT_NOT_FOUND",
      actor.role === "STUDENT"
        ? "Kamu tidak memiliki akses ke data ini."
        : "Data mahasiswa tidak ditemukan.",
    );
  }

  return student;
}

export async function getOwnStudentProfile(
  binding: D1Database,
  userId: string,
): Promise<StudentDetailDto> {
  const student = await findStudentByUserId(binding, userId);
  if (!student) {
    throw new StudentServiceError(
      404,
      "STUDENT_NOT_FOUND",
      "Data mahasiswa tidak ditemukan.",
    );
  }
  return student;
}

export async function editStudent(
  binding: D1Database,
  actorUserId: string,
  studentId: string,
  payload: unknown,
): Promise<StudentDetailDto> {
  const input = updateStudentInputSchema.parse(payload);
  const current = await getStudentForActor(binding, studentId, {
    role: "ADMIN",
    userId: actorUserId,
  });
  const nim = normalizeNim(input.nim);

  if (nim !== current.nim && !current.nimEditable) {
    throw new StudentServiceError(
      409,
      "NIM_LOCKED_BY_ATTENDANCE",
      "NIM tidak dapat diubah karena mahasiswa sudah memiliki histori kehadiran.",
    );
  }

  try {
    return await updateStudentProfile(
      binding,
      actorUserId,
      current,
      input,
      nim,
      createInternalEmail(nim),
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new StudentServiceError(
        409,
        "NIM_ALREADY_EXISTS",
        "NIM sudah terdaftar.",
      );
    }
    if (
      error instanceof Error &&
      error.message === "STUDENT_UPDATE_NOT_APPLIED"
    ) {
      throw new StudentServiceError(
        409,
        "STUDENT_UPDATE_CONFLICT",
        "Data mahasiswa berubah. Muat ulang lalu coba lagi.",
      );
    }
    throw error;
  }
}

export async function changeStudentStatus(
  binding: D1Database,
  actorUserId: string,
  studentId: string,
  payload: unknown,
) {
  const input = studentStatusInputSchema.parse(payload);
  const current = await getStudentForActor(binding, studentId, {
    role: "ADMIN",
    userId: actorUserId,
  });
  await updateStudentStatus(binding, actorUserId, current, input);
  return { id: current.id, isActive: input.isActive };
}

export async function provisionStudent(
  env: AppEnv,
  actorUserId: string,
  requestHeaders: Headers,
  payload: unknown,
  groupId?: string,
) {
  const input = createStudentInputSchema.parse(payload);
  const nim = normalizeNim(input.nim);
  const activeGroupId = groupId ?? (await getActiveGroup(env.DB)).id;
  let createdUserId: string | null = null;

  try {
    const created = await createAuth(env).api.createUser({
      body: {
        email: createInternalEmail(nim),
        password: input.temporaryPassword,
        name: input.fullName,
        role: "STUDENT",
        data: {
          username: nim,
          displayUsername: nim,
          isActive: true,
          mustChangePassword: true,
        },
      },
      headers: requestHeaders,
    });
    createdUserId = created.user.id;
    const studentId = crypto.randomUUID();
    const now = Date.now();

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO students
           (id, user_id, group_id, nim, phone, notes, deleted_at,
            created_at, updated_at, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      ).bind(
        studentId,
        created.user.id,
        activeGroupId,
        nim,
        input.phone,
        input.notes,
        now,
        now,
        actorUserId,
        actorUserId,
      ),
      env.DB.prepare(
        `INSERT INTO audit_logs
           (id, action, entity_type, entity_id, metadata, created_at, created_by)
           VALUES (?, 'STUDENT_PROVISIONED', 'student', ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        studentId,
        JSON.stringify({ userId: created.user.id, source: "ADMIN" }),
        now,
        actorUserId,
      ),
    ]);

    return {
      id: studentId,
      userId: created.user.id,
      groupId: activeGroupId,
      nim,
      fullName: created.user.name,
      phone: input.phone,
      notes: input.notes,
      isActive: true,
      mustChangePassword: true,
    };
  } catch (error) {
    if (createdUserId) {
      await env.DB.prepare("DELETE FROM user WHERE id = ?")
        .bind(createdUserId)
        .run()
        .catch(() => {
          console.error("Failed to clean up incomplete student provisioning", {
            userId: createdUserId,
          });
        });
    }

    if (isUniqueConstraintError(error) || isExistingUserError(error)) {
      throw new StudentServiceError(
        409,
        "NIM_ALREADY_EXISTS",
        "NIM sudah terdaftar.",
      );
    }
    throw error;
  }
}

export async function importStudents(
  env: AppEnv,
  actorUserId: string,
  requestHeaders: Headers,
  payload: unknown,
) {
  const input = studentImportInputSchema.parse(payload);
  let rows;
  try {
    rows = analyzeStudentCsv(input.csv);
  } catch (error) {
    if (error instanceof CsvParseError) {
      throw new StudentServiceError(422, "CSV_INVALID", error.message);
    }
    throw error;
  }

  const existingNims = await findExistingNims(
    env.DB,
    rows.map((row) => row.nim).filter(Boolean),
  );
  for (const row of rows) {
    if (existingNims.has(row.nim)) {
      row.errors.push("NIM sudah terdaftar.");
    }
  }

  if (input.dryRun) {
    const results: StudentImportResult[] = rows.map((row) => ({
      ...row,
      status: row.errors.length === 0 ? "VALID" : "INVALID",
    }));
    return summarizeImport(true, results);
  }

  const groupId = (await getActiveGroup(env.DB)).id;
  const results: StudentImportResult[] = [];

  for (const row of rows) {
    if (row.errors.length > 0) {
      results.push({ ...row, status: "INVALID" });
      continue;
    }

    const temporaryPassword = generateTemporaryPassword();
    try {
      const student = await provisionStudent(
        env,
        actorUserId,
        requestHeaders,
        {
          nim: row.nim,
          fullName: row.fullName,
          phone: row.phone,
          notes: null,
          temporaryPassword,
        } satisfies CreateStudentInput,
        groupId,
      );
      results.push({
        ...row,
        status: "CREATED",
        studentId: student.id,
        temporaryPassword,
      });
    } catch (error) {
      const message =
        error instanceof StudentServiceError
          ? error.message
          : "Akun belum dapat dibuat.";
      results.push({ ...row, status: "ERROR", errors: [message] });
    }
  }

  return summarizeImport(false, results);
}

export function generateTemporaryPassword(length = 16): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const alphabet = `${letters}${digits}`;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const characters = Array.from(
    bytes,
    (byte) => alphabet[byte % alphabet.length],
  );
  characters[0] = letters[bytes[0] % letters.length];
  characters[1] = digits[bytes[1] % digits.length];
  return characters.join("");
}

function summarizeImport(dryRun: boolean, results: StudentImportResult[]) {
  return {
    dryRun,
    summary: {
      total: results.length,
      valid: results.filter((row) => row.status === "VALID").length,
      invalid: results.filter((row) => row.status === "INVALID").length,
      created: results.filter((row) => row.status === "CREATED").length,
      failed: results.filter((row) => row.status === "ERROR").length,
    },
    results,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("UNIQUE constraint failed") ||
      error.message.includes("constraint failed"))
  );
}

function isExistingUserError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("already exists")
  );
}
