import { db } from "@/db";
import { RoutineForm } from "@/features/routine/components/routine-form";
import { asc, eq } from "drizzle-orm";
import { subjects, teachers } from "@/db/schema";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherNewRoutinePage() {
  await requireAuth(["TEACHER"]);

  const [allSubjects, allTeachers] = await Promise.all([
    db.query.subjects.findMany({
      where: eq(subjects.isActive, true),
      orderBy: [asc(subjects.name)],
    }),
    db.query.teachers.findMany({
      orderBy: [asc(teachers.name)],
    }),
  ]);

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/teacher/routine" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Add Routine Entry</h2>
          <p className="text-muted-foreground text-sm">Schedule a new weekly recurring subject time slot.</p>
        </div>
      </div>
      
      <RoutineForm subjects={allSubjects} teachers={allTeachers} />
    </div>
  );
}
