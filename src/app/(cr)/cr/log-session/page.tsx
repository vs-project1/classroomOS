import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { db } from "@/db";
import { subjects, enrollments, studentProfiles } from "@/db/schema";
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

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Log Class Session</h1>
        <p className="text-muted-foreground text-sm">Record attendance and topics covered for today's class.</p>
      </div>
      <SessionForm subjects={allSubjects} />
    </div>
  );
}
