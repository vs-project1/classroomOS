import { db } from "@/db";
import { subjects, students } from "@/db/schema";
import { SessionForm } from "./session-form";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const allSubjects = await db.select().from(subjects).orderBy(asc(subjects.name));
  const allStudents = await db.select().from(students).orderBy(asc(students.name));

  if (allSubjects.length === 0 || allStudents.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Log Session</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Missing Prerequisites</CardTitle>
            <CardDescription>You cannot log a session yet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              To log a session, you must first have at least one subject and one student registered in the system.
            </p>
            <div className="flex gap-4">
              {allSubjects.length === 0 && (
                <Link href="/subjects" className={buttonVariants({ variant: "outline" })}>
                  Create Subject
                </Link>
              )}
              {allStudents.length === 0 && (
                <Link href="/students" className={buttonVariants({ variant: "outline" })}>
                  Register Student
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">New Session</h2>
      </div>
      <SessionForm 
        students={allStudents} 
        subjects={allSubjects} 
        defaultValues={{
          subjectId: typeof params.subjectId === 'string' ? params.subjectId : undefined,
          startTime: typeof params.startTime === 'string' ? params.startTime : undefined,
          endTime: typeof params.endTime === 'string' ? params.endTime : undefined,
          routineId: typeof params.routineId === 'string' ? params.routineId : undefined,
        }}
      />
    </div>
  );
}
