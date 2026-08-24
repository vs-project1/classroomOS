import { db } from "@/db";
import {
  enrollments,
  examResults,
  exams,
  subjectGradeWeights,
} from "@/db/schema";
import type { ExamType } from "@/db/schema";
import type { CategoryBreakdown } from "@/lib/grading/compute";
import { computeSubjectGrade } from "@/lib/grading/compute";
import { asc, eq, inArray } from "drizzle-orm";
import { resolveCurrentStudent } from "@/lib/auth";
import { SubjectCard, type SubjectCardExam } from "@/components/grades/subject-card";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyGradesPage() {
  const student = await resolveCurrentStudent();

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5 p-6">
        <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
          <GraduationCap className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold font-fira-sans tracking-tight">No Student Context Found</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Please log in as a student to view your weighted grades and exam breakdowns.
        </p>
      </div>
    );
  }

  const studentEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.studentId, student.id),
    with: { subject: true },
    orderBy: (enrollments, { asc }) => [asc(enrollments.subjectId)],
  });

  const enrolledSubjects = studentEnrollments
    .map((e) => e.subject)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .sort((a, b) => a.name.localeCompare(b.name));
  const subjectIds = enrolledSubjects.map((s) => s.id);

  const [subjectExams, myResults, subjectWeights] = await Promise.all([
    subjectIds.length
      ? db
          .select()
          .from(exams)
          .where(inArray(exams.subjectId, subjectIds))
          .orderBy(asc(exams.examDate))
      : Promise.resolve([]),
    db.select().from(examResults).where(eq(examResults.studentId, student.id)),
    subjectIds.length
      ? db
          .select()
          .from(subjectGradeWeights)
          .where(inArray(subjectGradeWeights.subjectId, subjectIds))
      : Promise.resolve([]),
  ]);

  const resultByExam = new Map(myResults.map((r) => [r.examId, r]));

  const cards = enrolledSubjects.map((subject) => {
    const subjectExamRows = subjectExams.filter((e) => e.subjectId === subject.id);

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
      subjectWeights
        .filter((w) => w.subjectId === subject.id)
        .map((w) => ({ category: w.category as ExamType, weightPct: w.weightPct }))
    );

    const cardExams: SubjectCardExam[] = subjectExamRows.map((exam) => {
      const result = resultByExam.get(exam.id);
      return {
        examId: exam.id,
        title: exam.title,
        category: exam.examType,
        totalMarks: exam.totalMarks,
        obtainedMarks: result?.obtainedMarks ?? null,
        isAbsent: result?.isAbsent ?? false,
        hasResult: Boolean(result),
      };
    });

    return (
      <SubjectCard
        key={subject.id}
        subjectName={subject.name}
        subjectCode={subject.code}
        finalPct={grade.finalPct}
        letter={grade.letter}
        categories={grade.categories satisfies CategoryBreakdown[]}
        exams={cardExams}
      />
    );
  });

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">My Grades</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Your weighted assessment standing for every enrolled subject. Absent exams are excluded from the math; unmarked ones stay pending.
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Enrolled Subjects</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Grades appear here once you are enrolled in subjects that have assessments scheduled.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{cards}</div>
      )}
    </div>
  );
}
