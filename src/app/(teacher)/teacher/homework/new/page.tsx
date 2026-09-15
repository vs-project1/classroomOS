import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import { subjects } from "@/db/schema";
import { HomeworkForm } from "@/features/assignments/components/homework-form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherNewHomeworkPage() {
  const user = await requireAuth(["TEACHER"]);

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 pb-6 border-b border-border/40">
          <Link href="/teacher/homework" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Assign New Work</h2>
            <p className="text-muted-foreground text-sm">Create a new assignment or lab practical deliverable for your students.</p>
          </div>
        </div>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  const teacherSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, user.teacherId),
    orderBy: [asc(subjects.name)],
  });

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/teacher/homework" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Assign New Work</h2>
          <p className="text-muted-foreground text-sm">Create a new assignment or lab practical deliverable for your students.</p>
        </div>
      </div>

      <HomeworkForm subjects={teacherSubjects} />
    </div>
  );
}
