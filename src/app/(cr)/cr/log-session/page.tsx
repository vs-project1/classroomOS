import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { students, subjects } from "@/db/schema";
import { SessionForm } from "@/features/sessions/components/session-form";
import { asc } from "drizzle-orm";

export default async function LogSessionPage() {
  await requireAuth(["CR", "ADMIN"]);

  const allStudents = await db.query.students.findMany({
    orderBy: [asc(students.rollNumber)],
  });
  
  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
  });

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Log Session</h1>
        <p className="text-muted-foreground text-sm">Record attendance and topics covered for today's class.</p>
      </div>
      <SessionForm students={allStudents} subjects={allSubjects} />
    </div>
  );
}
