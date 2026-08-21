import { db } from "@/db";
import { subjects, students } from "@/db/schema";
import { SessionForm } from "./session-form";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const allSubjects = await db.select().from(subjects).orderBy(asc(subjects.name));
  const allStudents = await db.select().from(students).orderBy(asc(students.name));

  if (allSubjects.length === 0 || allStudents.length === 0) {
    return (
      <div className="flex-1 space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Log Session</h2>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg mb-2">Missing Prerequisites</h3>
          <p className="text-sm text-muted-foreground mb-6">
            To log a session, you must first have at least one subject and one student registered in the system.
          </p>
          <div className="flex gap-4">
            {allSubjects.length === 0 && (
              <Link href="/subjects" className={buttonVariants({ variant: "outline" })}>
                Create Subject
              </Link>
            )}
            {allStudents.length === 0 && (
              <Link href="/admin/students" className={buttonVariants({ variant: "outline" })}>
                Register Student
              </Link>
            )}
          </div>
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
        students={allStudents} 
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
