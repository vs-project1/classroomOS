import { z } from "zod";
import type { ImportRowError } from "@/lib/csv/types";

export const ENROLLMENT_CSV_COLUMNS = [
  "rollNumber",
  "subjectCode",
  "semester",
] as const;

/**
 * One CSV data row for the enrollment importer. Keys are normalized header
 * names (see normalizeCsvHeader): "Roll Number" -> rollnumber.
 *
 * - `rollNumber` is matched against `students.roll_number` (authoritative
 *   source of studentId — `student_profiles.roll_number` maps to a userId,
 *   not a students.id).
 * - `subjectCode` is uppercased for case-insensitive resolution.
 */
export const EnrollmentCsvRowSchema = z.object({
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  subjectCode: z.string().trim().min(1, "Subject code is required").toUpperCase(),
  semester: z.coerce
    .number()
    .int("Semester must be a whole number")
    .min(1, "Semester must be between 1 and 8")
    .max(8, "Semester must be between 1 and 8"),
});

export type EnrollmentCsvRow = z.infer<typeof EnrollmentCsvRowSchema>;

/** A validated CSV row paired with its Excel-style row number (first data row = 2). */
export interface NumberedEnrollmentRow {
  rowNumber: number;
  data: EnrollmentCsvRow;
}

export interface EnrollmentDedupeResult {
  /** Rows that passed in-file dedupe, safe to pre-check against the DB. */
  kept: NumberedEnrollmentRow[];
  errors: ImportRowError[];
}

/** Dedupe key: same student + subject + semester cannot appear twice in one file. */
export function enrollmentRowKey(row: EnrollmentCsvRow): string {
  return `${row.rollNumber.toLowerCase()}|${row.subjectCode}|${row.semester}`;
}

/**
 * In-file dedupe on (rollNumber, subjectCode, semester). First occurrence
 * wins; later duplicates are dropped and reported as DUPLICATE_ROW errors.
 */
export function dedupeEnrollmentRows(
  rows: NumberedEnrollmentRow[],
): EnrollmentDedupeResult {
  const seen = new Map<string, number>();
  const kept: NumberedEnrollmentRow[] = [];
  const errors: ImportRowError[] = [];

  for (const { data: row, rowNumber } of rows) {
    const key = enrollmentRowKey(row);
    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      errors.push({
        row: rowNumber,
        field: "rollnumber",
        code: "DUPLICATE_ROW",
        reason: `Duplicate enrollment for "${row.rollNumber}" / ${row.subjectCode} / semester ${row.semester} (first seen on row ${firstRow}).`,
      });
      continue;
    }
    seen.set(key, rowNumber);
    kept.push({ rowNumber, data: row });
  }

  return { kept, errors };
}
