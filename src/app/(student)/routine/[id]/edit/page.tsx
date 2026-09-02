import { db } from "@/db";
import { RoutineForm } from "@/features/routine/components/routine-form";
import { asc, eq } from "drizzle-orm";
import { subjects, weeklyRoutine } from "@/db/schema";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [allSubjects, routine] = await Promise.all([
    db.query.subjects.findMany({
      orderBy: [asc(subjects.name)],
    }),
    db.query.weeklyRoutine.findFirst({
      where: eq(weeklyRoutine.id, id),
    }),
  ]);

  if (!routine) {
    notFound();
  }

  const defaultValues = {
    id: routine.id,
    subjectId: routine.subjectId,
    dayOfWeek: routine.dayOfWeek,
    startTime: routine.startTime,
    endTime: routine.endTime,
    teacherName: routine.teacherName || undefined,
    room: routine.room || undefined,
    notes: routine.notes || undefined,
  };

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/routine" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Edit Routine Entry</h2>
          <p className="text-muted-foreground text-sm">Update time slots, room assignments, or faculty details.</p>
        </div>
      </div>
      
      <RoutineForm subjects={allSubjects} defaultValues={defaultValues} />
    </div>
  );
}
