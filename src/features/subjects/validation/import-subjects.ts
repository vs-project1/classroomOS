import { z } from "zod";
import type { ImportRowError } from "@/lib/csv/types";

export const SUBJECT_CSV_COLUMNS = [
  "code",
  "name",
  "teacherEmail",
] as const;

/**
 * One CSV data row for the subject importer. Keys are normalized header
 * names (see normalizeCsvHeader): "Teacher Email" -> teacheremail.
 *
 * - `code` is uppercased so DB lookups and in-file dedupe are case-insensitive.
 * - `teacherEmail` is optional; a blank cell imports the subject with no
 *   assigned teacher, but a non-blank value that does not resolve to a
 *   teacher is an FK_NOT_FOUND row error (handled by the action).
 */
export const SubjectCsvRowSchema = z.object({
  code: z.string().trim().min(1, "Code is required").toUpperCase(),
  name: z.string().trim().min(1, "Name is required"),
  teacherEmail: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (v) => v.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Invalid email address format",
    )
    .optional(),
});

export type SubjectCsvRow = z.infer<typeof SubjectCsvRowSchema>;

/** A validated CSV row paired with its Excel-style row number (first data row = 2). */
export interface NumberedSubjectRow {
  rowNumber: number;
  data: SubjectCsvRow;
}

export interface SubjectDedupeResult {
  /** Rows that passed in-file dedupe, safe to pre-check against the DB. */
  kept: NumberedSubjectRow[];
  errors: ImportRowError[];
}

/**
 * In-file dedupe on subject code. First occurrence wins; later duplicates are
 * dropped and reported as DUPLICATE_CODE row-level errors.
 */
export function dedupeSubjectRows(rows: NumberedSubjectRow[]): SubjectDedupeResult {
  const seenCodes = new Map<string, number>();
  const kept: NumberedSubjectRow[] = [];
  const errors: ImportRowError[] = [];

  for (const { data: row, rowNumber } of rows) {
    const firstRow = seenCodes.get(row.code);
    if (firstRow !== undefined) {
      errors.push({
        row: rowNumber,
        field: "code",
        code: "DUPLICATE_CODE",
        reason: `Duplicate subject code "${row.code}" (first seen on row ${firstRow}).`,
      });
      continue;
    }
    seenCodes.set(row.code, rowNumber);
    kept.push({ rowNumber, data: row });
  }

  return { kept, errors };
}
