import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import { toCsv } from "@/lib/csv/stringify";
import {
  csvFileResponse,
  fmtDateTime,
  requireAdminForExport,
} from "../_lib";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/subjects
 * Admin-only CSV export of the subject catalog with assigned teacher names.
 */
export async function GET() {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const rows = await db
    .select({
      code: subjects.code,
      name: subjects.name,
      slug: subjects.slug,
      teacherName: teachers.name,
      createdAt: subjects.createdAt,
    })
    .from(subjects)
    .leftJoin(teachers, eq(subjects.teacherId, teachers.id))
    .orderBy(asc(subjects.code));

  const csv = toCsv(
    rows.map((r) => ({
      code: r.code,
      name: r.name,
      slug: r.slug,
      teacherName: r.teacherName ?? "",
      createdAt: fmtDateTime(r.createdAt),
    })),
  );

  return csvFileResponse(csv, "subjects");
}
