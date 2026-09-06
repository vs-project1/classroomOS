import { db } from "@/db";
import { subjects, enrollments, weeklyRoutine, students, dailySessions, dailyAttendance } from "@/db/schema";
import { SessionForm, type StudentRosterItem } from "@/features/sessions/components/session-form";
import { asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { nptStartOfDay } from "@/lib/timezone";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Page-level guard (defense in depth beyond the shared layout): only
  // roles that can create sessions may even view the logging form.
  const user = await requireAuth(["CR", "TEACHER", "ADMIN"]);
  const params = await searchParams;

  // Scope the subject picker to the caller's authority:
  // TEACHER -> their assigned subjects; CR -> enrolled subjects; ADMIN -> all or assigned subjects.
  let allSubjects: Array<typeof subjects.$inferSelect> = [];
  if (user.role === "ADMIN") {
    allSubjects = user.teacherId
      ? await db.select().from(subjects).where(eq(subjects.teacherId, user.teacherId)).orderBy(asc(subjects.name))
      : await db.select().from(subjects).orderBy(asc(subjects.name));
  } else if (user.role === "TEACHER" && user.teacherId) {
    allSubjects = await db
      .select()
      .from(subjects)
      .where(eq(subjects.teacherId, user.teacherId))
      .orderBy(asc(subjects.name));
  } else if (user.role === "CR") {
    const student = await resolveCurrentStudent();
    if (student) {
      const crEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollments.studentId, student.id),
      });
      const subjectIds = crEnrollments.map((e) => e.subjectId);
      allSubjects =
        subjectIds.length > 0
          ? await db
              .select()
              .from(subjects)
              .where(inArray(subjects.id, subjectIds))
              .orderBy(asc(subjects.name))
          : [];
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

  if (allSubjects.length === 0) {
    return (
      <div className="flex-1 space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Log Session</h2>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg mb-2">Missing Prerequisites</h3>
          <p className="text-sm text-muted-foreground mb-6">
            To log a session, you must first have at least one subject registered in the system.
          </p>
          <Link href="/subjects" className={buttonVariants({ variant: "outline" })}>
            Create Subject
          </Link>
        </div>
      </div>
    );
  }

  // Fetch student roster
  let rawStudents: Array<{ id: string; name: string; rollNumber: string }> = [];
  if (subjectIds.length > 0) {
    const enrolled = await db
      .select({
        id: students.id,
        name: students.name,
        rollNumber: students.rollNumber,
      })
      .from(students)
      .innerJoin(enrollments, eq(students.id, enrollments.studentId))
      .where(inArray(enrollments.subjectId, subjectIds))
      .groupBy(students.id)
      .orderBy(asc(students.rollNumber));

    if (enrolled.length > 0) {
      rawStudents = enrolled;
    }
  }

  if (rawStudents.length === 0) {
    rawStudents = await db
      .select({
        id: students.id,
        name: students.name,
        rollNumber: students.rollNumber,
      })
      .from(students)
      .orderBy(asc(students.rollNumber));
  }

  // Cross-reference today's morning roll call to detect absentees
  const todayNpt = nptStartOfDay();
  const todayDailySessions = await db.query.dailySessions.findMany({
    where: eq(dailySessions.date, todayNpt),
  });

  const morningAbsentSet = new Set<string>();
  if (todayDailySessions.length > 0) {
    const sessionIds = todayDailySessions.map((ds) => ds.id);
    const morningRecords = await db
      .select()
      .from(dailyAttendance)
      .where(inArray(dailyAttendance.dailySessionId, sessionIds));

    for (const rec of morningRecords) {
      if (rec.status === "absent") {
        morningAbsentSet.add(rec.studentId);
      }
    }
  }

  const studentsWithStatus: StudentRosterItem[] = rawStudents.map((s) => ({
    id: s.id,
    name: s.name,
    rollNumber: s.rollNumber,
    morningAbsent: morningAbsentSet.has(s.id),
  }));

  return (
    <div className="flex-1 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/lecture-logs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold font-fira-sans tracking-tight text-foreground">Log Class Session</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Record lecture coverage and assignments for your scheduled classes.</p>
        </div>
      </div>
      <SessionForm
        subjects={allSubjects}
        routineSlots={routineSlots}
        userRole={user.role as "ADMIN" | "TEACHER" | "CR"}
        students={studentsWithStatus}
        defaultValues={{
          subjectId: typeof params.subjectId === 'string' ? params.subjectId : undefined,
          startTime: typeof params.startTime === 'string' ? params.startTime : undefined,
          endTime: typeof params.endTime === 'string' ? params.endTime : undefined,
          routineId: typeof params.routineId === 'string' ? params.routineId : undefined,
          sessionDate: typeof params.sessionDate === 'string' ? params.sessionDate : undefined,
        }}
      />
    </div>
  );
}
