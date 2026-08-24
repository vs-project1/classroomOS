"use server";

import crypto from "node:crypto";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { enrollments, students, subjects } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { parseCsv } from "@/lib/csv/parse";
import {
  emptyCsvError,
  toImportRowError,
  type ImportResult,
  type ImportRowError,
  MAX_IMPORT_ROWS,
} from "@/lib/csv/types";
import {
  EnrollmentCsvRowSchema,
  dedupeEnrollmentRows,
  type NumberedEnrollmentRow,
} from "../validation/import-enrollments";

/**
 * Bulk-import enrollments from CSV text
 * (columns: rollNumber,subjectCode,semester).
 *
 * Flow: admin guard -> parse + per-row validation -> in-file dedupe on
 * (rollNumber, subjectCode, semester) -> DB pre-checks via single inArray
 * queries: unknown roll numbers / subject codes are FK_NOT_FOUND row errors;
 * rows whose (studentId, subjectId) pair already exists count as `skipped`,
 * not errors -> atomic transaction with sequential inserts.
 *
 * `dryRun: true` performs zero writes. Unlike the student importer, an
 * already-enrolled row is a benign skip — it does NOT abort the batch.
 * Any hard row error (unknown roll/code, duplicates) aborts a real commit.
 */
export async function importEnrollmentsCsv(
  csvText: string,
  opts: { dryRun: boolean },
): Promise<ImportResult> {
  await requireAuth(["ADMIN"]);

  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [emptyCsvError()],
    };
  }

  // 1. Parse + per-row validation.
  const parsed = parseCsv(csvText, EnrollmentCsvRowSchema);
  const totalDataRows = parsed.data.length;
  if (totalDataRows > MAX_IMPORT_ROWS) {
    return {
      success: false,
      imported: 0,
      skipped: totalDataRows,
      errors: [
        {
          row: 0,
          code: "INVALID_VALUE",
          reason: `Import limit is ${MAX_IMPORT_ROWS} rows per batch; received ${totalDataRows}. Split the file and retry.`,
        },
      ],
    };
  }

  const rowErrors: ImportRowError[] = parsed.errors.map(toImportRowError);

  // 2. In-file dedupe on (rollNumber, subjectCode, semester).
  const numbered: NumberedEnrollmentRow[] = parsed.data.map((data, i) => ({
    data,
    rowNumber: i + 2,
  }));
  const deduped = dedupeEnrollmentRows(numbered);
  rowErrors.push(...deduped.errors);

  // 3. Resolve FKs — one inArray query per target, no N+1.
  const rolls = Array.from(
    new Set(deduped.kept.map((r) => r.data.rollNumber.toLowerCase())),
  );
  const codes = Array.from(new Set(deduped.kept.map((r) => r.data.subjectCode)));

  // students.roll_number is authoritative: it maps directly to students.id.
  // (student_profiles.roll_number maps to a userId and cannot resolve a
  // students.id without a join key, so it is intentionally not consulted.)
  const studentIdByRoll = new Map<string, string>();
  if (rolls.length > 0) {
    const rows = await db
      .select({ id: students.id, rollNumber: students.rollNumber })
      .from(students)
      .where(inArray(students.rollNumber, rolls));
    for (const s of rows) studentIdByRoll.set(s.rollNumber.toLowerCase(), s.id);
  }

  const subjectIdByCode = new Map<string, string>();
  if (codes.length > 0) {
    const rows = await db
      .select({ id: subjects.id, code: subjects.code })
      .from(subjects)
      .where(inArray(subjects.code, codes));
    for (const s of rows) subjectIdByCode.set(s.code.toUpperCase(), s.id);
  }

  const resolved: NumberedEnrollmentRow[] = [];
  for (const entry of deduped.kept) {
    const row = entry.data;
    let ok = true;

    if (!studentIdByRoll.has(row.rollNumber.toLowerCase())) {
      rowErrors.push({
        row: entry.rowNumber,
        field: "rollnumber",
        code: "FK_NOT_FOUND",
        reason: `No student found with roll number "${row.rollNumber}".`,
      });
      ok = false;
    }
    if (!subjectIdByCode.has(row.subjectCode)) {
      rowErrors.push({
        row: entry.rowNumber,
        field: "subjectcode",
        code: "FK_NOT_FOUND",
        reason: `Unknown subject code "${row.subjectCode}".`,
      });
      ok = false;
    }
    if (ok) resolved.push(entry);
  }

  // 4. Already-enrolled pairs become skips (single query over the candidate
  //    students, then an in-memory pair set).
  const candidateStudentIds = Array.from(
    new Set(resolved.map((r) => studentIdByRoll.get(r.data.rollNumber.toLowerCase())!)),
  );
  const existingPairs = new Set<string>();
  if (candidateStudentIds.length > 0) {
    const rows = await db
      .select({
        studentId: enrollments.studentId,
        subjectId: enrollments.subjectId,
      })
      .from(enrollments)
      .where(inArray(enrollments.studentId, candidateStudentIds));
    for (const r of rows) existingPairs.add(`${r.studentId}|${r.subjectId}`);
  }

  const toInsert = resolved.filter((entry) => {
    const studentId = studentIdByRoll.get(entry.data.rollNumber.toLowerCase())!;
    const subjectId = subjectIdByCode.get(entry.data.subjectCode)!;
    return !existingPairs.has(`${studentId}|${subjectId}`);
  });
  const alreadyEnrolled = resolved.length - toInsert.length;

  // 5. Dry run stops here; any hard error also aborts a real import.
  if (opts.dryRun || rowErrors.length > 0) {
    return {
      success: rowErrors.length === 0 && toInsert.length > 0,
      imported: 0,
      skipped: Math.max(0, totalDataRows - toInsert.length),
      errors: rowErrors,
    };
  }

  if (toInsert.length === 0) {
    return {
      success: false,
      imported: 0,
      skipped: totalDataRows,
      errors:
        rowErrors.length > 0
          ? rowErrors
          : [
              {
                row: 0,
                code: "MISSING_COLUMN",
                reason: "No valid rows to import.",
              },
            ],
    };
  }

  // 6. Atomic commit. Sequential inserts inside one transaction — NO Promise.all.
  let imported = 0;
  try {
    await db.transaction(async (tx) => {
      for (const { data: row } of toInsert) {
        const studentId = studentIdByRoll.get(row.rollNumber.toLowerCase());
        const subjectId = subjectIdByCode.get(row.subjectCode);
        if (!studentId || !subjectId) continue; // already rejected above; safety net

        await tx
          .insert(enrollments)
          .values({
            id: `enr_${crypto.randomUUID()}`,
            studentId,
            subjectId,
            semester: row.semester,
          })
          .onConflictDoNothing(); // unique(student_id, subject_id) safety net
        imported++;
      }
    });
  } catch (error) {
    // NEXT_REDIRECT digests must never be swallowed by error mapping.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Failed enrollment CSV import:", error);
    return {
      success: false,
      imported: 0,
      skipped: totalDataRows,
      errors: [
        {
          row: 0,
          code: "INVALID_VALUE",
          reason:
            "The import failed and was rolled back. No records were changed.",
        },
      ],
    };
  }

  revalidatePath("/admin/students");
  revalidatePath("/subjects");

  return {
    success: true,
    imported,
    skipped: alreadyEnrolled + Math.max(0, totalDataRows - imported - alreadyEnrolled),
    errors: [],
  };
}
