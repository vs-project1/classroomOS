import { db } from "@/db";
import { RoutineForm } from "../../routine-form";
import { asc, eq } from "drizzle-orm";
import { subjects, weeklyRoutine } from "@/db/schema";
import { notFound } from "next/navigation";

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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Edit Routine Entry</h2>
      </div>
      
      <RoutineForm subjects={allSubjects} defaultValues={defaultValues} />
    </div>
  );
}
