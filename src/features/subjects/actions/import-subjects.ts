"use server";

import crypto from "node:crypto";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { parseCsv } from "@/lib/csv/parse";
import {
  emptyCsvError,
  toImportRowError,
  type ImportResult,
  type ImportRowError,
  MAX_IMPORT_ROWS,
} from "@/lib/csv/types";
import { slugify, uniqueSlugify } from "@/utils/slug";
import {
  SubjectCsvRowSchema,
  dedupeSubjectRows,
  type NumberedSubjectRow,
} from "../validation/import-subjects";

function uniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed")
  );
}

/**
 * Bulk-import subjects from CSV text (columns: code,name,teacherEmail).
 *
 * Flow: admin guard -> parse + per-row validation -> in-file dedupe on code ->
 * DB pre-checks (single inArray query per lookup, no N+1): existing subject
 * codes are DUPLICATE_CODE errors; teacherEmail resolves via one pre-fetched
 * teacher map, unknown emails are FK_NOT_FOUND row errors -> atomic
 * transaction with sequential inserts.
 *
 * `dryRun: true` performs zero writes and returns the full list of errors
 * that would block the import. Any row-level error aborts a real commit —
 * the batch is all-or-nothing. `.onConflictDoNothing` on the unique code is
 * kept as an idempotency safety net.
 */
export async function importSubjectsCsv(
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
  const parsed = parseCsv(csvText, SubjectCsvRowSchema);
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

  // 2. In-file dedupe on subject code (row numbers preserved).
  const numbered: NumberedSubjectRow[] = parsed.data.map((data, i) => ({
    data,
    rowNumber: i + 2,
  }));
  const deduped = dedupeSubjectRows(numbered);
  rowErrors.push(...deduped.errors);

  // 3. DB pre-checks — single inArray query per uniqueness target, no N+1.
  const codes = Array.from(new Set(deduped.kept.map((r) => r.data.code)));
  const teacherEmails = Array.from(
    new Set(
      deduped.kept
        .map((r) => r.data.teacherEmail)
        .filter((e): e is string => Boolean(e)),
    ),
  );

  const existingCodes = new Set<string>();
  if (codes.length > 0) {
    const rows = await db
      .select({ code: subjects.code })
      .from(subjects)
      .where(inArray(subjects.code, codes));
    for (const r of rows) existingCodes.add(r.code.toUpperCase());
  }

  const teacherIdByEmail = new Map<string, string>();
  if (teacherEmails.length > 0) {
    const rows = await db
      .select({ id: teachers.id, email: teachers.email })
      .from(teachers)
      .where(inArray(teachers.email, teacherEmails));
    for (const t of rows) {
      if (t.email) teacherIdByEmail.set(t.email.toLowerCase(), t.id);
    }
  }

  const finalRows: NumberedSubjectRow[] = [];
  for (const entry of deduped.kept) {
    const row = entry.data;
    if (existingCodes.has(row.code)) {
      rowErrors.push({
        row: entry.rowNumber,
        field: "code",
        code: "DUPLICATE_CODE",
        reason: `A subject with code "${row.code}" already exists.`,
      });
      continue;
    }
    if (row.teacherEmail && !teacherIdByEmail.has(row.teacherEmail)) {
      rowErrors.push({
        row: entry.rowNumber,
        field: "teacheremail",
        code: "FK_NOT_FOUND",
        reason: `No teacher found with email "${row.teacherEmail}".`,
      });
      continue;
    }
    finalRows.push(entry);
  }

  // 4. Slug allocation — unique within the batch AND against existing slugs.
  const existingSlugs = (
    await db.select({ slug: subjects.slug }).from(subjects)
  ).map((s) => s.slug);
  const slugByCode = new Map<string, string>();
  for (const { data: row } of finalRows) {
    const slug = uniqueSlugify(slugify(row.name), existingSlugs);
    existingSlugs.push(slug); // guarantee uniqueness across this batch too
    slugByCode.set(row.code, slug);
  }

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
        await tx
          .insert(subjects)
          .values({
            id: `sub_${crypto.randomUUID()}`,
            name: row.name,
            slug: slugByCode.get(row.code) ?? slugify(row.name),
            code: row.code,
            teacherId: row.teacherEmail
              ? teacherIdByEmail.get(row.teacherEmail) ?? null
              : null,
          })
          .onConflictDoNothing();
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
    console.error("Failed subject CSV import:", error);
    return {
      success: false,
      imported: 0,
      skipped: totalDataRows,
      errors: [
        uniqueViolation(error)
          ? {
              row: 0,
              code: "DUPLICATE_CODE",
              reason:
                "The batch conflicts with existing subjects (duplicate code or slug). Nothing was imported.",
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

  revalidatePath("/admin/subjects");
  revalidatePath("/subjects");

  return {
    success: true,
    imported,
    skipped: Math.max(0, totalDataRows - imported),
    errors: [],
  };
}
