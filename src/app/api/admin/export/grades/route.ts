import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assignmentSubmissions,
  examResults,
  exams,
  homework,
  students,
  subjects,
} from "@/db/schema";
import { toCsv } from "@/lib/csv/stringify";
import {
  csvFileResponse,
  fmtDate,
  readExportFilters,
  requireAdminForExport,
  studentFilterConditions,
} from "../_lib";

export const runtime = "nodejs";

const EXAM_COLUMNS = [
  "studentRollNumber",
  "studentName",
  "subjectName",
  "examTitle",
  "examType",
  "totalMarks",
  "obtainedMarks",
  "isAbsent",
];

const HOMEWORK_COLUMNS = [
  "studentRollNumber",
  "studentName",
  "subjectName",
  "homeworkTitle",
  "dueDate",
  "score",
  "status",
];

/**
 * GET /api/admin/export/grades[?faculty=&semester=]
 * Admin-only CSV export of all graded work, as two clearly headed sections
 * in one file: EXAM RESULTS then HOMEWORK SCORES.
 *
 * Note: the homework table has no max-marks column, so homework rows carry
 * the raw awarded `score` only.
 */
export async function GET(req: Request) {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const filters = readExportFilters(req);
  const conditions = studentFilterConditions(
    filters,
    students.faculty,
    students.semester,
  );

  const [examRows, homeworkRows] = await Promise.all([
    db
      .select({
        rollNumber: students.rollNumber,
        studentName: students.name,
        subjectName: subjects.name,
        examTitle: exams.title,
        examType: exams.examType,
        totalMarks: exams.totalMarks,
        obtainedMarks: examResults.obtainedMarks,
        isAbsent: examResults.isAbsent,
      })
      .from(examResults)
      .innerJoin(exams, eq(examResults.examId, exams.id))
      .innerJoin(subjects, eq(exams.subjectId, subjects.id))
      .innerJoin(students, eq(examResults.studentId, students.id))
      .where(and(...conditions))
      .orderBy(asc(students.rollNumber), asc(subjects.name)),
    db
      .select({
        rollNumber: students.rollNumber,
        studentName: students.name,
        subjectName: subjects.name,
        homeworkTitle: homework.title,
        dueDate: homework.dueDate,
        score: assignmentSubmissions.score,
      })
      .from(assignmentSubmissions)
      .innerJoin(homework, eq(assignmentSubmissions.homeworkId, homework.id))
      .innerJoin(subjects, eq(homework.subjectId, subjects.id))
      .innerJoin(students, eq(assignmentSubmissions.studentId, students.id))
      // Only graded submissions carry an authoritative score.
      .where(and(eq(assignmentSubmissions.status, "graded"), ...conditions))
      .orderBy(desc(homework.dueDate), asc(students.rollNumber)),
  ]);

  const examSection = toCsv(
    examRows.map((r) => ({
      studentRollNumber: r.rollNumber,
      studentName: r.studentName,
      subjectName: r.subjectName,
      examTitle: r.examTitle,
      examType: r.examType,
      totalMarks: r.totalMarks,
      obtainedMarks: r.obtainedMarks ?? "",
      isAbsent: r.isAbsent ? "true" : "false",
    })),
    EXAM_COLUMNS,
  );

  // Strip the second BOM — only the file start may carry one.
  const homeworkSection = toCsv(
    homeworkRows.map((r) => ({
      studentRollNumber: r.rollNumber,
      studentName: r.studentName,
      subjectName: r.subjectName,
      homeworkTitle: r.homeworkTitle,
      dueDate: fmtDate(r.dueDate),
      score: r.score ?? "",
      status: "graded",
    })),
    HOMEWORK_COLUMNS,
  ).replace(/^\uFEFF/, "");

  const csv = [
    "SECTION: EXAM RESULTS",
    examSection,
    "",
    "SECTION: HOMEWORK SCORES",
    homeworkSection,
  ].join("\r\n");

  return csvFileResponse(csv, "grades");
}
