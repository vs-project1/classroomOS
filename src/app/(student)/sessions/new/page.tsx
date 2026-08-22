import { db } from "@/db";
import { subjects, enrollments } from "@/db/schema";
import { SessionForm } from "./session-form";
import { asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Page-level guard (defense in depth beyond the shared layout): only
  // roles that can create sessions may even view the logging form.
  const user = await requireAuth(["CR", "TEACHER", "ADMIN"]);
  const params = await searchParams;

  // Scope the subject picker to the caller's authority:
  // TEACHER/ADMIN -> their assigned subjects; CR -> enrolled subjects.
  let allSubjects: Array<typeof subjects.$inferSelect> = [];
  if (user.role === "TEACHER" || user.role === "ADMIN") {
    if (user.teacherId) {
      allSubjects = await db
        .select()
        .from(subjects)
        .where(eq(subjects.teacherId, user.teacherId))
        .orderBy(asc(subjects.name));
    }
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

  return (
    <div className="flex-1 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/lecture-logs" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-2xl font-bold font-fira-sans tracking-tight text-foreground">New Session</h2>
      </div>
      <SessionForm
        subjects={allSubjects}
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
