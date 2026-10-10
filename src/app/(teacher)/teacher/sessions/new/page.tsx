import { db } from "@/db";
import { subjects, weeklyRoutine } from "@/db/schema";
import { SessionForm } from "@/features/sessions/components/session-form";
import { asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherNewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireAuth(["TEACHER"]);
  const params = await searchParams;

  const allSubjects = user.teacherId
    ? await db.select().from(subjects).where(eq(subjects.teacherId, user.teacherId)).orderBy(asc(subjects.name))
    : [];

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
            To log a session, you must have at least one subject assigned to you.
          </p>
          <Link href="/teacher" className={buttonVariants({ variant: "outline" })}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/teacher" className={buttonVariants({ variant: "ghost", size: "icon" })}>
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
        userRole="TEACHER"
        defaultValues={{
          subjectId: typeof params.subjectId === "string" ? params.subjectId : undefined,
          startTime: typeof params.startTime === "string" ? params.startTime : undefined,
          endTime: typeof params.endTime === "string" ? params.endTime : undefined,
          routineId: typeof params.routineId === "string" ? params.routineId : undefined,
          sessionDate: typeof params.sessionDate === "string" ? params.sessionDate : undefined,
        }}
      />
    </div>
  );
}
