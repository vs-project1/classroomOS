import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { db } from "@/db";
import { subjects, enrollments, weeklyRoutine } from "@/db/schema";
import { SessionForm } from "@/features/sessions/components/session-form";
import { and, asc, eq, inArray } from "drizzle-orm";
import { toSemesterNumber } from "@/lib/semester";

export default async function LogSessionPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const params = searchParams ? await searchParams : undefined;
  
  let allSubjects: Array<typeof subjects.$inferSelect> = [];
  if (user.role === "ADMIN") {
    allSubjects = await db.query.subjects.findMany({ where: eq(subjects.isActive, true), orderBy: [asc(subjects.name)] });
  } else if (user.role === "TEACHER" && user.teacherId) {
    allSubjects = await db.select().from(subjects).where(and(eq(subjects.teacherId, user.teacherId), eq(subjects.isActive, true))).orderBy(asc(subjects.name));
  } else {
    const student = await resolveCurrentStudent();
    if (student) {
      const crEnrollments = await db.query.enrollments.findMany({ where: eq(enrollments.studentId, student.id) });
      const subjectIds = crEnrollments.map((e) => e.subjectId);
      if (subjectIds.length > 0) {
        allSubjects = await db.select().from(subjects).where(and(inArray(subjects.id, subjectIds), eq(subjects.isActive, true))).orderBy(asc(subjects.name));
      } else if (student.semester != null) {
        const semNum = toSemesterNumber(student.semester);
        allSubjects = await db.select().from(subjects).where(and(eq(subjects.semester, semNum), eq(subjects.isActive, true))).orderBy(asc(subjects.name));
      }
    }
  }

  // Query weekly routine slots for available subjects
  const subjectIds = allSubjects.map((s) => s.id);
  let routineSlots: any[] = [];
  if (subjectIds.length > 0) {
    routineSlots = await db.query.weeklyRoutine.findMany({
      where: inArray(weeklyRoutine.subjectId, subjectIds),
      orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          columns: {
            id: true,
            name: true,
            code: true,
            semester: true,
          },
        },
      },
    });
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Log Class Session</h1>
        <p className="text-muted-foreground text-sm">Record lecture topics, assignments, and notes for your classes.</p>
      </div>
      <SessionForm
        subjects={allSubjects}
        routineSlots={routineSlots}
        userRole={user.role as "ADMIN" | "TEACHER" | "CR"}
        defaultValues={{
          subjectId: typeof params?.subjectId === "string" ? params.subjectId : undefined,
          startTime: typeof params?.startTime === "string" ? params.startTime : undefined,
          endTime: typeof params?.endTime === "string" ? params.endTime : undefined,
          routineId: typeof params?.routineId === "string" ? params.routineId : undefined,
          sessionDate: typeof params?.sessionDate === "string" ? params.sessionDate : undefined,
        }}
      />
    </div>
  );
}
