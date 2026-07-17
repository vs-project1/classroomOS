import { db } from "@/db";
import { asc } from "drizzle-orm";
import { subjects } from "@/db/schema";
import { HomeworkForm } from "./homework-form";

export const dynamic = "force-dynamic";

export default async function NewHomeworkPage() {
  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Assign New</h2>
      </div>
      
      <HomeworkForm subjects={allSubjects} />
    </div>
  );
}
