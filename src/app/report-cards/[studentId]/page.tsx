import { db } from "@/db";
import {
  attendance,
  enrollments,
  examResults,
  exams,
  subjectGradeWeights,
  students,
  studentProfiles,
  subjects,
} from "@/db/schema";
import type { ExamType } from "@/db/schema";
import { computeSubjectGrade } from "@/lib/grading/compute";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { calculateAttendanceMetrics } from "@/features/attendance/calculations/attendance-projection";
import { PrintButton } from "@/components/grades/print-button";
import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import "./print.css";
import { toRoman } from "@/lib/utils/roman";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function ReportCardPage({ params }: Props) {
  const { studentId } = await params;

  // Access: ADMIN/TEACHER any student; STUDENT/CR only their own record.
  const user = await requireAuth();

  if (user.role === "STUDENT" || user.role === "CR") {
    const self = await resolveCurrentStudent();
    if (!self || self.id !== studentId) {
      return <AccessDenied />;
    }
  }

  const student = await db.query.students.findFirst({
    where: eq(students.id, studentId),
  });
  if (!student) notFound();

  const [studentEnrollments, attendanceRows] = await Promise.all([
    db
      .select({ subjectId: enrollments.subjectId })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId)),
    db
      .select({ status: attendance.status })
      .from(attendance)
      .where(eq(attendance.studentId, studentId)),
  ]);

  const subjectIds = [...new Set(studentEnrollments.map((e) => e.subjectId))];
  const enrolledSubjects = subjectIds.length
    ? await db
        .select()
        .from(subjects)
        .where(inArray(subjects.id, subjectIds))
        .orderBy(asc(subjects.name))
    : [];

  const [allExams, myResults, allWeights] = await Promise.all([
    subjectIds.length
      ? db
          .select()
          .from(exams)
          .where(inArray(exams.subjectId, subjectIds))
          .orderBy(asc(exams.examDate))
      : Promise.resolve([]),
    db.select().from(examResults).where(eq(examResults.studentId, studentId)),
    subjectIds.length
      ? db
          .select()
          .from(subjectGradeWeights)
          .where(inArray(subjectGradeWeights.subjectId, subjectIds))
      : Promise.resolve([]),
  ]);

  const resultByExam = new Map(myResults.map((r) => [r.examId, r]));

  // Attendance % — same convention as the student attendance page:
  // present counts as attended; late/excused/absent reported as breakdown.
  const presentCount = attendanceRows.filter((r) => r.status === "present").length;
  const lateCount = attendanceRows.filter((r) => r.status === "late").length;
  const excusedCount = attendanceRows.filter((r) => r.status === "excused").length;
  const absentCount = attendanceRows.filter((r) => r.status === "absent").length;
  const attendedForMetrics = presentCount + lateCount;
  const effectiveTotal = Math.max(attendedForMetrics, attendanceRows.length - excusedCount);
  const attendanceMetrics = calculateAttendanceMetrics(
    attendedForMetrics,
    effectiveTotal,
    { late: lateCount, excused: excusedCount, absent: absentCount },
    80
  );

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-[210mm] mx-auto space-y-4 no-print">
        <div className="flex items-center justify-between gap-4">
          <a
            href={user.role === "ADMIN" ? "/admin/gradebook" : user.role === "TEACHER" ? "/teacher" : "/my-grades"}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to portal
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="report-card bg-card border border-border rounded-xl shadow-sm p-10 print:border-0 print:shadow-none print:rounded-none">
        <header className="text-center pb-6 border-b-2 border-foreground">
          <h1 className="text-2xl font-bold font-fira-sans tracking-tight">
            Classroom OS
          </h1>
          <p className="text-sm uppercase tracking-widest text-current/70 mt-1">
            Academic Report Card
          </p>
        </header>

        <section aria-label="Student information" className="py-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <InfoItem label="Student Name" value={student.name} />
          <InfoItem label="Roll Number" value={student.rollNumber} mono />
          <InfoItem label="Faculty" value={student.faculty ?? "—"} />
          <InfoItem label="Semester" value={student.semester ?? "—"} />
          <InfoItem
            label="Attendance"
            value={`${attendanceMetrics.percentage}% (${attendedForMetrics}/${effectiveTotal} sessions)`}
            mono
          />
          <InfoItem
            label="Issued On"
            value={formatNepaliDate(new Date())}
            mono
          />
        </section>

        <section aria-label="Subject results">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-foreground/40 bg-black/[0.03]">
                <th scope="col" className="text-left py-2 px-2 font-bold uppercase tracking-wide">Subject</th>
                <th scope="col" className="px-1.5 py-2 font-bold uppercase tracking-wide">Unit Test</th>
                <th scope="col" className="px-1.5 py-2 font-bold uppercase tracking-wide">Midterm</th>
                <th scope="col" className="px-1.5 py-2 font-bold uppercase tracking-wide">Pre-Board</th>
                <th scope="col" className="px-1.5 py-2 font-bold uppercase tracking-wide">Practical</th>
                <th scope="col" className="px-1.5 py-2 font-bold uppercase tracking-wide">Final</th>
                <th scope="col" className="px-2 py-2 font-bold uppercase tracking-wide text-right">Total</th>
                <th scope="col" className="px-2 py-2 font-bold uppercase tracking-wide">Grade</th>
              </tr>
            </thead>
            <tbody>
              {enrolledSubjects.map((subject) => {
                const subjectExamRows = allExams.filter((e) => e.subjectId === subject.id);
                const inputs = subjectExamRows.map((exam) => {
                  const result = resultByExam.get(exam.id);
                  return {
                    examId: exam.id,
                    category: exam.examType as ExamType,
                    totalMarks: exam.totalMarks,
                    obtainedMarks: result?.obtainedMarks ?? null,
                    isAbsent: result?.isAbsent ?? false,
                  };
                });
                const grade = computeSubjectGrade(
                  inputs,
                  allWeights
                    .filter((w) => w.subjectId === subject.id)
                    .map((w) => ({ category: w.category as ExamType, weightPct: w.weightPct }))
                );
                const pctByCategory = new Map(
                  grade.categories.map((c) => [c.category, c])
                );
                const categoryCell = (category: ExamType) => {
                  const breakdown = pctByCategory.get(category);
                  if (!breakdown || breakdown.pct === null) {
                    if (breakdown && breakdown.absentCount > 0) return "AB";
                    if (breakdown && breakdown.pendingCount > 0) return "Pending";
                    return "—";
                  }
                  return `${Math.round(breakdown.pct)}%`;
                };

                return (
                  <tr key={subject.id} className="border-b border-foreground/15">
                    <th scope="row" className="text-left py-2 px-2 font-medium">
                      {subject.name}
                      <span className="block text-[10px] uppercase font-fira-code opacity-60">
                        {subject.code}
                      </span>
                    </th>
                    <td className="text-center py-2 px-1.5 font-fira-code tabular-nums">{categoryCell("unit_test")}</td>
                    <td className="text-center py-2 px-1.5 font-fira-code tabular-nums">{categoryCell("midterm")}</td>
                    <td className="text-center py-2 px-1.5 font-fira-code tabular-nums">{categoryCell("pre_board")}</td>
                    <td className="text-center py-2 px-1.5 font-fira-code tabular-nums">{categoryCell("practical")}</td>
                    <td className="text-center py-2 px-1.5 font-fira-code tabular-nums">{categoryCell("final")}</td>
                    <td className="text-right py-2 px-2 font-bold font-fira-code tabular-nums">
                      {grade.finalPct !== null ? `${Math.round(grade.finalPct)}%` : "—"}
                    </td>
                    <td className="text-center py-2 px-2 font-bold">{grade.letter}</td>
                  </tr>
                );
              })}
              {enrolledSubjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 italic opacity-60">
                    No enrolled subjects for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <footer className="pt-10 flex justify-between gap-16 text-xs">
          <SignatureLine label="Class Teacher" />
          <SignatureLine label="Principal" />
        </footer>

        <p className="pt-4 text-center text-[9px] opacity-50">
          AB = Absent (excluded from calculation) · Pending = result awaited ·
          Totals are weighted by subject category weights.
        </p>
      </article>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest opacity-60">{label}</dt>
      <dd className={`font-semibold ${mono ? "font-fira-code" : "font-fira-sans"}`}>
        {value}
      </dd>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="flex-1 border-t border-foreground/50 pt-1 text-center">
      {label}
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 max-w-md mx-auto text-center p-6">
      <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
        <ShieldAlert className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="text-xl font-semibold font-fira-sans tracking-tight">
        Access Denied
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        You can only view your own report card.
      </p>
    </div>
  );
}
