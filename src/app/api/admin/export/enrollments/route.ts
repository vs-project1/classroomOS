import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, students, subjects } from "@/db/schema";
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
 * GET /api/admin/export/enrollments[?faculty=&semester=]
 * Admin-only CSV export of the student-subject enrollment map.
 */
export async function GET(req: Request) {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const filters = readExportFilters(req);
  const rows = await db
    .select({
      rollNumber: students.rollNumber,
      studentName: students.name,
      faculty: students.faculty,
      studentSemester: students.semester,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      enrollmentSemester: enrollments.semester,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .innerJoin(subjects, eq(enrollments.subjectId, subjects.id))
    .where(
      and(
        ...studentFilterConditions(
          filters,
          students.faculty,
          students.semester,
        ),
      ),
    )
    .orderBy(asc(students.rollNumber), asc(subjects.code));

  const csv = toCsv(
    rows.map((r) => ({
      rollNumber: r.rollNumber,
      studentName: r.studentName,
      faculty: r.faculty ?? "",
      studentSemester: r.studentSemester ?? "",
      subjectCode: r.subjectCode,
      subjectName: r.subjectName,
      enrollmentSemester: r.enrollmentSemester,
      enrolledAt: fmtDateTime(r.enrolledAt),
    })),
  );

  return csvFileResponse(csv, "enrollments");
}
