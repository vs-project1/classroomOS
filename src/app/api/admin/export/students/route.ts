import { and, asc } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { toCsv } from "@/lib/csv/stringify";
import {
  csvFileResponse,
  fmtDateTime,
  readExportFilters,
  requireAdminForExport,
  studentFilterConditions,
} from "../_lib";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/students[?faculty=&semester=]
 * Admin-only CSV export of the student roster.
 */
export async function GET(req: Request) {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const filters = readExportFilters(req);
  const rows = await db
    .select({
      rollNumber: students.rollNumber,
      name: students.name,
      email: students.email,
      phone: students.phone,
      faculty: students.faculty,
      semester: students.semester,
      createdAt: students.createdAt,
    })
    .from(students)
    .where(
      and(
        ...studentFilterConditions(
          filters,
          students.faculty,
          students.semester,
        ),
      ),
    )
    .orderBy(asc(students.rollNumber));

  const csv = toCsv(
    rows.map((r) => ({
      rollNumber: r.rollNumber,
      name: r.name,
      email: r.email ?? "",
      phone: r.phone ?? "",
      faculty: r.faculty ?? "",
      semester: r.semester ?? "",
      createdAt: fmtDateTime(r.createdAt),
    })),
  );

  return csvFileResponse(csv, "students");
}
