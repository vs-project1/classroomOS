import { db } from "@/db";
import { RoutineForm } from "../routine-form";
import { asc } from "drizzle-orm";
import { subjects } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewRoutinePage() {
  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Add Routine Entry</h2>
      </div>
      
      <RoutineForm subjects={allSubjects} />
    </div>
  );
}
