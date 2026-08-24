import { z } from "zod";
import type { ParseError } from "@/lib/csv/parse";

export const STUDENT_CSV_COLUMNS = [
  "name",
  "email",
  "rollNumber",
  "faculty",
  "semester",
  "section",
  "batchYear",
  "phone",
  "subjectCodes",
] as const;

/**
 * One CSV data row for the student importer. Keys are normalized header names
 * (see normalizeCsvHeader): "Roll Number" -> rollnumber, "Batch Year" -> batchyear.
 */
export const StudentCsvRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Invalid email address format"),
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  faculty: z.string().trim().min(1, "Faculty is required"),
  semester: z.coerce
    .number()
    .int("Semester must be a whole number")
    .min(1, "Semester must be between 1 and 8")
    .max(8, "Semester must be between 1 and 8"),
  section: z.string().trim().optional(),
  batchYear: z.coerce.number().int("Batch year must be a whole number").min(2000).max(2100),
  phone: z.string().trim().optional(),
  /** Comma-separated subject codes, e.g. "CS101,CS302". */
  subjectCodes: z.string().optional(),
});

export type StudentCsvRow = z.infer<typeof StudentCsvRowSchema>;

export type ImportErrorCode =
  | "MISSING_COLUMN"
  | "INVALID_EMAIL"
  | "INVALID_VALUE"
  | "DUPLICATE_ROLL"
  | "DUPLICATE_EMAIL"
  | "FK_NOT_FOUND";

export interface ImportRowError {
  row: number;
  field?: string;
  code: ImportErrorCode;
  reason: string;
}

/**
 * Split a comma-separated subjectCodes cell into trimmed, de-duplicated,
 * uppercase codes. Empty/undefined input yields [].
 */
export function splitSubjectCodes(raw?: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code.length > 0),
    ),
  );
}

/**
 * Map a kernel ParseError (zod issue) onto an import error with a stable code.
 */
export function toImportRowError(e: ParseError): ImportRowError {
  const base = { row: e.row, field: e.field };
  if (e.field === "email") {
    return {
      ...base,
      code: "INVALID_EMAIL",
      reason: e.message || "Invalid email address format.",
    };
  }
  if (e.code === "invalid_type" && /undefined/i.test(e.message)) {
    return {
      ...base,
      code: "MISSING_COLUMN",
      reason: `${e.field ?? "Column"} is required but missing.`,
    };
  }
  return {
    ...base,
    code: "INVALID_VALUE",
    reason: e.message || "Invalid value.",
  };
}

/** A validated CSV row paired with its Excel-style row number (first data row = 2). */
export interface NumberedStudentRow {
  rowNumber: number;
  data: StudentCsvRow;
}

export interface DedupeResult {
  /** Rows that passed in-file dedupe, safe to pre-check against the DB. */
  kept: NumberedStudentRow[];
  errors: ImportRowError[];
}

/**
 * In-file dedupe on rollNumber AND email. First occurrence wins; later
 * duplicates are dropped and reported as row-level errors.
 */
export function dedupeStudentRows(rows: NumberedStudentRow[]): DedupeResult {
  const seenRolls = new Map<string, number>();
  const seenEmails = new Map<string, number>();
  const kept: NumberedStudentRow[] = [];
  const errors: ImportRowError[] = [];

  for (const { data: row, rowNumber } of rows) {
    const roll = row.rollNumber.toLowerCase();
    const email = row.email;

    if (seenRolls.has(roll)) {
      errors.push({
        row: rowNumber,
        field: "rollnumber",
        code: "DUPLICATE_ROLL",
        reason: `Duplicate roll number "${row.rollNumber}" (first seen on row ${seenRolls.get(roll)}).`,
      });
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push({
        row: rowNumber,
        field: "email",
        code: "DUPLICATE_EMAIL",
        reason: `Duplicate email "${email}" (first seen on row ${seenEmails.get(email)}).`,
      });
      continue;
    }

    seenRolls.set(roll, rowNumber);
    seenEmails.set(email, rowNumber);
    kept.push({ rowNumber, data: row });
  }

  return { kept, errors };
}
