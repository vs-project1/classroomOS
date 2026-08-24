"use server";

import crypto from "node:crypto";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  users,
  students,
  studentProfiles,
  subjects,
  enrollments,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { hashPasswordSync } from "@/lib/auth/password";
import { parseCsv } from "@/lib/csv/parse";
import {
  StudentCsvRowSchema,
  dedupeStudentRows,
  splitSubjectCodes,
  toImportRowError,
  type ImportRowError,
  type NumberedStudentRow,
} from "../validation/import-students";

export type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
};

/** SQLite safety cap from the Phase 2 plan. */
const MAX_IMPORT_ROWS = 2000;

function ordinalSemester(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix} Semester`;
}

function uniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed")
  );
}

/**
 * Bulk-import students from CSV text.
 *
 * Flow: admin guard -> parse + per-row validation -> in-file dedupe on
 * rollNumber/email -> DB pre-checks (single inArray queries, no N+1) ->
 * subject-code resolution via one pre-fetched map -> atomic transaction with
 * sequential inserts.
 *
 * `dryRun: true` performs zero writes and returns the full list of errors
 * that would block the import. Any row-level error aborts a real commit —
 * the batch is all-or-nothing.
 */
export async function importStudentsCsv(
  csvText: string,
  opts: { dryRun: boolean },
): Promise<ImportResult> {
  await requireAuth(["ADMIN"]);

  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [
        { row: 0, code: "MISSING_COLUMN", reason: "CSV content is empty." },
      ],
    };
  }

  // 1. Parse + per-row validation.
  const parsed = parseCsv(csvText, StudentCsvRowSchema);
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
          reason: `Import limit is ${MAX_IMPORT_ROWS} rows per batch; received ${parsed.data.length}. Split the file and retry.`,
        },
      ],
    };
  }

  const rowErrors: ImportRowError[] = parsed.errors.map(toImportRowError);

  // 2. In-file dedupe on rollNumber AND email (row numbers preserved).
  const numbered: NumberedStudentRow[] = parsed.data.map((data, i) => ({
    data,
    rowNumber: i + 2,
  }));
  const deduped = dedupeStudentRows(numbered);
  rowErrors.push(...deduped.errors);

  // 3. DB pre-checks — single inArray query per uniqueness target, no N+1.
  const emails = Array.from(new Set(deduped.kept.map((r) => r.data.email)));
  const rolls = Array.from(
    new Set(deduped.kept.map((r) => r.data.rollNumber)),
  );

  const existingEmails = new Set<string>();
  const existingRolls = new Set<string>();

  if (emails.length > 0) {
    // users.email is the login-identity uniqueness target.
    const rows = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.email, emails));
    for (const r of rows) existingEmails.add(r.email);
  }

  if (rolls.length > 0) {
    // rollNumber is unique on BOTH students and student_profiles.
    const [profileRows, studentRows] = await Promise.all([
      db
        .select({ rollNumber: studentProfiles.rollNumber })
        .from(studentProfiles)
        .where(inArray(studentProfiles.rollNumber, rolls)),
      db
        .select({ rollNumber: students.rollNumber })
        .from(students)
        .where(inArray(students.rollNumber, rolls)),
    ]);
    for (const r of profileRows) existingRolls.add(r.rollNumber.toLowerCase());
    for (const r of studentRows) existingRolls.add(r.rollNumber.toLowerCase());
  }

  const afterDbCheck: NumberedStudentRow[] = [];
  for (const entry of deduped.kept) {
    const row = entry.data;
    const rowNumber = entry.rowNumber;
    if (
      existingRolls.has(row.rollNumber.toLowerCase()) ||
      existingEmails.has(row.email)
    ) {
      if (existingRolls.has(row.rollNumber.toLowerCase())) {
        rowErrors.push({
          row: rowNumber,
          field: "rollnumber",
          code: "DUPLICATE_ROLL",
          reason: `A student with roll number "${row.rollNumber}" already exists.`,
        });
      }
      if (existingEmails.has(row.email)) {
        rowErrors.push({
          row: rowNumber,
          field: "email",
          code: "DUPLICATE_EMAIL",
          reason: `An account with email "${row.email}" already exists.`,
        });
      }
      continue;
    }
    afterDbCheck.push(entry);
  }

  // 4. Resolve subjectCodes -> ids via ONE pre-fetched map, BEFORE the tx.
  const wantedCodes = new Set(
    afterDbCheck.flatMap((e) => splitSubjectCodes(e.data.subjectCodes)),
  );
  const subjectIdByCode = new Map<string, string>();
  if (wantedCodes.size > 0) {
    const subjectRows = await db
      .select({ id: subjects.id, code: subjects.code })
      .from(subjects)
      .where(inArray(subjects.code, Array.from(wantedCodes)));
    for (const s of subjectRows) subjectIdByCode.set(s.code.toUpperCase(), s.id);

    for (const entry of afterDbCheck) {
      for (const code of splitSubjectCodes(entry.data.subjectCodes)) {
        if (!subjectIdByCode.has(code)) {
          rowErrors.push({
            row: entry.rowNumber,
            field: "subjectcodes",
            code: "FK_NOT_FOUND",
            reason: `Unknown subject code "${code}".`,
          });
        }
      }
    }
  }

  const finalRows =
    wantedCodes.size > 0
      ? afterDbCheck.filter((entry) =>
          splitSubjectCodes(entry.data.subjectCodes).every((code) =>
            subjectIdByCode.has(code),
          ),
        )
      : afterDbCheck;

  // 5. Dry run stops here; any error also aborts a real import.
  if (opts.dryRun || rowErrors.length > 0) {
    return {
      success: rowErrors.length === 0 && finalRows.length > 0,
      imported: 0,
      skipped: Math.max(0, totalDataRows - finalRows.length),
      errors: rowErrors,
    };
  }

  if (finalRows.length === 0) {
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
      for (const { data: row } of finalRows) {
        const userId = `usr_${crypto.randomUUID()}`;
        // Random one-time password; user is forced to change it at first login.
        const passwordHash = hashPasswordSync(crypto.randomUUID());

        await tx.insert(users).values({
          id: userId,
          email: row.email,
          passwordHash,
          role: "STUDENT",
          mustChangePassword: true,
          isActive: true,
        });

        const studentId = `std_${crypto.randomUUID()}`;
        await tx.insert(students).values({
          id: studentId,
          name: row.name,
          rollNumber: row.rollNumber,
          email: row.email,
          phone: row.phone || null,
          faculty: row.faculty,
          semester: ordinalSemester(row.semester),
        });

        await tx.insert(studentProfiles).values({
          id: `sp_${crypto.randomUUID()}`,
          userId,
          rollNumber: row.rollNumber,
          faculty: row.faculty,
          semester: row.semester,
          section: row.section || "A",
          batchYear: row.batchYear,
          phone: row.phone || null,
        });

        for (const code of splitSubjectCodes(row.subjectCodes)) {
          const subjectId = subjectIdByCode.get(code);
          if (!subjectId) continue; // already rejected above; safety net
          await tx
            .insert(enrollments)
            .values({
              id: `enr_${crypto.randomUUID()}`,
              studentId,
              subjectId,
              semester: row.semester,
            })
            .onConflictDoNothing();
        }

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
    console.error("Failed student CSV import:", error);
    return {
      success: false,
      imported: 0,
      skipped: totalDataRows,
      errors: [
        uniqueViolation(error)
          ? {
              row: 0,
              code: "DUPLICATE_ROLL",
              reason:
                "The batch conflicts with existing records (duplicate roll number or email). Nothing was imported.",
            }
          : {
              row: 0,
              code: "INVALID_VALUE",
              reason:
                "The import failed and was rolled back. No records were changed.",
            },
      ],
    };
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/accounts");

  return {
    success: true,
    imported,
    skipped: Math.max(0, totalDataRows - imported),
    errors: [],
  };
}
