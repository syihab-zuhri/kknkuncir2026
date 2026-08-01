import { normalizeNim } from "@/lib/auth/identity";

import { CsvParseError } from "./errors";
import type { StudentImportRow } from "./schema";

const HEADER_ALIASES = {
  nim: ["nim"],
  fullName: ["nama", "nama_lengkap", "full_name", "name"],
  phone: ["telepon", "no_telepon", "phone"],
} as const;

export function analyzeStudentCsv(csv: string): StudentImportRow[] {
  const records = parseCsv(csv.replace(/^\uFEFF/, ""));

  if (records.length < 2) {
    throw new CsvParseError(
      "CSV harus memiliki header dan minimal satu baris mahasiswa.",
    );
  }

  const headers = records[0].map(normalizeHeader);
  const nimIndex = findHeader(headers, HEADER_ALIASES.nim);
  const nameIndex = findHeader(headers, HEADER_ALIASES.fullName);
  const phoneIndex = findHeader(headers, HEADER_ALIASES.phone);

  if (nimIndex === -1 || nameIndex === -1) {
    throw new CsvParseError(
      "Header CSV wajib memuat kolom nim dan nama. Kolom telepon bersifat opsional.",
    );
  }

  const rows = records
    .slice(1)
    .filter((record) => record.some((cell) => cell.trim().length > 0))
    .map((record, index) => {
      const nim = normalizeNim(record[nimIndex] ?? "");
      const fullName = (record[nameIndex] ?? "").trim();
      const phone =
        phoneIndex === -1 ? null : (record[phoneIndex] ?? "").trim() || null;
      const errors: string[] = [];

      if (!/^\d{3,32}$/.test(nim)) {
        errors.push("NIM harus berisi 3–32 digit.");
      }
      if (fullName.length < 2 || fullName.length > 120) {
        errors.push("Nama harus berisi 2–120 karakter.");
      }
      if (phone && phone.length > 30) {
        errors.push("Nomor telepon maksimal 30 karakter.");
      }

      return { row: index + 2, nim, fullName, phone, errors };
    });

  if (rows.length === 0) {
    throw new CsvParseError("CSV tidak memiliki baris mahasiswa.");
  }
  if (rows.length > 50) {
    throw new CsvParseError("Satu impor maksimal memuat 50 mahasiswa.");
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.nim, (counts.get(row.nim) ?? 0) + 1);
  }
  for (const row of rows) {
    if (row.nim && (counts.get(row.nim) ?? 0) > 1) {
      row.errors.push("NIM muncul lebih dari sekali di CSV.");
    }
  }

  return rows;
}

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new CsvParseError(
          "Tanda kutip CSV berada pada posisi yang tidak valid.",
        );
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new CsvParseError("Tanda kutip CSV belum ditutup.");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function findHeader(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}
