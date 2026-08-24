import { db } from "@/db";
import {
  enrollments,
  examResults,
  exams,
  students,
  subjectGradeWeights,
  subjects,
} from "@/db/schema";
import type { ExamType } from "@/db/schema";
import { asc, inArray } from "drizzle-orm";
import { computeSubjectGrade } from "@/lib/grading/compute";
import { GradeGrid } from "@/components/gradebook/grade-grid";
import type { GradeCell, StudentGradeRow } from "@/components/gradebook/types";
import { WeightEditor } from "@/components/gradebook/weight-editor";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminGradebookPage() {
  const [allSubjects, allEnrollments, allExams, allResults, allWeights] =
    await Promise.all([
      db.select().from(subjects).orderBy(asc(subjects.name)),
      db.select().from(enrollments),
      db.select().from(exams).orderBy(asc(exams.examDate)),
      db.select().from(examResults),
      db.select().from(subjectGradeWeights),
    ]);

  // Students that appear in at least one enrollment drive the matrix rows.
  const enrolledStudentIds = [...new Set(allEnrollments.map((e) => e.studentId))];
  const enrolledStudents = enrolledStudentIds.length
    ? await db
        .select()
        .from(students)
        .where(inArray(students.id, enrolledStudentIds))
        .orderBy(asc(students.rollNumber))
    : [];

  // --- Index lookups (avoid nested scans while assembling the matrix) ---
  const resultByKey = new Map<string, (typeof allResults)[number]>();
  for (const r of allResults) {
    resultByKey.set(`${r.examId}:${r.studentId}`, r);
  }
  const examsBySubject = new Map<string, typeof allExams>();
  for (const exam of allExams) {
    const bucket = examsBySubject.get(exam.subjectId);
    if (bucket) bucket.push(exam);
    else examsBySubject.set(exam.subjectId, [exam]);
  }
  const weightsBySubject = new Map<string, typeof allWeights>();
  for (const w of allWeights) {
    const bucket = weightsBySubject.get(w.subjectId);
    if (bucket) bucket.push(w);
    else weightsBySubject.set(w.subjectId, [w]);
  }

  const gridSubjects = allSubjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
  }));

  // Enrolled subject ids per student — cells only exist where an enrollment does.
  const subjectsByStudent = new Map<string, Set<string>>();
  for (const e of allEnrollments) {
    const set = subjectsByStudent.get(e.studentId) ?? new Set<string>();
    set.add(e.subjectId);
    subjectsByStudent.set(e.studentId, set);
  }

  const rows: StudentGradeRow[] = enrolledStudents.map((student) => {
    const cells: StudentGradeRow["cells"] = {};
    const enrolled = subjectsByStudent.get(student.id);

    for (const subject of allSubjects) {
      if (!enrolled?.has(subject.id)) continue;

      const subjectExams = examsBySubject.get(subject.id) ?? [];
      const subjectWeights = (weightsBySubject.get(subject.id) ?? []).map((w) => ({
        category: w.category as ExamType,
        weightPct: w.weightPct,
      }));

      const inputs = subjectExams.map((exam) => {
        const result = resultByKey.get(`${exam.id}:${student.id}`);
        return {
          examId: exam.id,
          category: exam.examType as ExamType,
          totalMarks: exam.totalMarks,
          obtainedMarks: result?.obtainedMarks ?? null,
          isAbsent: result?.isAbsent ?? false,
        };
      });

      const grade = computeSubjectGrade(inputs, subjectWeights);

      const cell: GradeCell = {
        finalPct: grade.finalPct,
        letter: grade.letter,
        gradedCount: grade.categories.reduce((n, c) => n + c.gradedCount, 0),
        absentCount: grade.categories.reduce((n, c) => n + c.absentCount, 0),
        pendingCount: grade.categories.reduce((n, c) => n + c.pendingCount, 0),
        exams: subjectExams.map((exam) => {
          const result = resultByKey.get(`${exam.id}:${student.id}`);
          return {
            examId: exam.id,
            title: exam.title,
            category: exam.examType,
            totalMarks: exam.totalMarks,
            examDate: exam.examDate.toISOString(),
            obtainedMarks: result?.obtainedMarks ?? null,
            isAbsent: result?.isAbsent ?? false,
            hasResult: Boolean(result),
          };
        }),
      };
      cells[subject.id] = cell;
    }

    return {
      studentId: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      semester: student.semester,
      cells,
    };
  });

  const hasData = gridSubjects.length > 0 && rows.length > 0;

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Gradebook</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Weighted assessment matrix across every enrollment. Click any cell to drill into the underlying exam results.
          </p>
        </div>
        {hasData && (
          <span className="text-xs font-bold tracking-wide text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 w-fit">
            {rows.length} Students × {gridSubjects.length} Subjects
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Grades Yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The gradebook lights up once subjects have enrolled students. Add enrollments and schedule exams to begin tracking weighted marks.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Category weights" className="space-y-4">
            <h3 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground font-fira-code">
              Category Weights
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {gridSubjects.map((subject) => (
                <WeightEditor
                  key={subject.id}
                  subjectId={subject.id}
                  subjectName={subject.name}
                  subjectCode={subject.code}
                  initialWeights={Object.fromEntries(
                    (weightsBySubject.get(subject.id) ?? []).map((w) => [w.category, w.weightPct])
                  )}
                />
              ))}
            </div>
          </section>

          <GradeGrid subjects={gridSubjects} rows={rows} />
        </>
      )}
    </div>
  );
}
