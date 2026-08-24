import type { ParseError } from "./parse";

/**
 * Shared result/error vocabulary for every CSV bulk importer
 * (students, subjects, enrollments). Kept framework-free and DB-free so
 * pure validation modules can depend on it without pulling server code.
 */

/**
 * SQLite safety cap from the Phase 2 plan (max rows per import batch).
 */
export const MAX_IMPORT_ROWS = 2000;

export type ImportErrorCode =
  | "MISSING_COLUMN"
  | "INVALID_EMAIL"
  | "INVALID_VALUE"
  | "DUPLICATE_ROLL"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_CODE"
  | "DUPLICATE_ROW"
  | "FK_NOT_FOUND";

export interface ImportRowError {
  row: number;
  field?: string;
  code: ImportErrorCode;
  reason: string;
}

export type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
};

/** Empty-CSV sentinel returned by every importer before parsing. */
export function emptyCsvError(): ImportRowError {
  return {
    row: 0,
    code: "MISSING_COLUMN",
    reason: "CSV content is empty.",
  };
}

/**
 * Map a kernel ParseError (zod issue) onto an import error with a stable code.
 * Fields whose name ends in "email" classify as INVALID_EMAIL so importer-
 * specific email columns (e.g. teacherEmail) get the same treatment.
 */
export function toImportRowError(e: ParseError): ImportRowError {
  const base = { row: e.row, field: e.field };
  if (e.field && /email$/i.test(e.field)) {
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

/**
 * Ordinal label matching how `students.semester` stores terms,
 * e.g. 1 -> "1st Semester", 3 -> "3rd Semester".
 */
export function ordinalSemester(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix} Semester`;
}
