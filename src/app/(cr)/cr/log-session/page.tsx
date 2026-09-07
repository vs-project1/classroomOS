import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { db } from "@/db";
import { subjects, enrollments, studentProfiles, weeklyRoutine } from "@/db/schema";
import { SessionForm } from "@/features/sessions/components/session-form";
import { asc, eq, inArray } from "drizzle-orm";
import { toRoman } from "@/lib/utils/roman";

export default async function LogSessionPage() {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  
  let allSubjects: Array<typeof subjects.$inferSelect> = [];
  if (user.role === "ADMIN") {
    allSubjects = await db.query.subjects.findMany({ orderBy: [asc(subjects.name)] });
  } else if (user.role === "TEACHER" && user.teacherId) {
    allSubjects = await db.select().from(subjects).where(eq(subjects.teacherId, user.teacherId)).orderBy(asc(subjects.name));
  } else {
    const student = await resolveCurrentStudent();
    if (student) {
      const crEnrollments = await db.query.enrollments.findMany({ where: eq(enrollments.studentId, student.id) });
      const subjectIds = crEnrollments.map((e) => e.subjectId);
      if (subjectIds.length > 0) {
        allSubjects = await db.select().from(subjects).where(inArray(subjects.id, subjectIds)).orderBy(asc(subjects.name));
      } else if (user.studentProfileId) {
        const profile = await db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.id, user.studentProfileId),
        });
        if (profile && profile.semester != null) {
          const semesterRoman = toRoman(profile.semester);
          allSubjects = await db.select().from(subjects).where(eq(subjects.semester, semesterRoman)).orderBy(asc(subjects.name));
        }
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
      />
    </div>
  );
}
