import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classSessions, students, subjects } from "@/db/schema";
import { toCsv } from "@/lib/csv/stringify";
import {
  csvFileResponse,
  fmtDate,
  readExportFilters,
  requireAdminForExport,
  studentFilterConditions,
} from "../_lib";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/attendance[?faculty=&semester=]
 * Admin-only CSV export of every attendance record with denormalized
 * date/student/subject columns for spreadsheet analysis.
 */
export async function GET(req: Request) {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const filters = readExportFilters(req);
  const rows = await db
    .select({
      sessionDate: classSessions.sessionDate,
      status: attendance.status,
      rollNumber: students.rollNumber,
      studentName: students.name,
      subjectCode: subjects.code,
      subjectName: subjects.name,
    })
    .from(attendance)
    .innerJoin(classSessions, eq(attendance.classSessionId, classSessions.id))
    .innerJoin(students, eq(attendance.studentId, students.id))
    .innerJoin(subjects, eq(classSessions.subjectId, subjects.id))
    .where(
      and(
        ...studentFilterConditions(
          filters,
          students.faculty,
          students.semester,
        ),
      ),
    )
    .orderBy(desc(classSessions.sessionDate), asc(students.rollNumber));

  const csv = toCsv(
    rows.map((r) => ({
      date: fmtDate(r.sessionDate),
      studentRollNumber: r.rollNumber,
      studentName: r.studentName,
      subjectCode: r.subjectCode,
      subjectName: r.subjectName,
      status: r.status,
    })),
  );

  return csvFileResponse(csv, "attendance");
}
