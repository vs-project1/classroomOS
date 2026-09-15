import { db } from "@/db";
import { asc } from "drizzle-orm";
import { subjects } from "@/db/schema";
import { HomeworkForm } from "@/features/assignments/components/homework-form";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewHomeworkPage() {
  await requireAuth(["ADMIN"]);
  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
  });

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full p-8 pt-6">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/admin/homework" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assign New Work</h2>
          <p className="text-muted-foreground text-sm">Create a new assignment or lab practical deliverable.</p>
        </div>
      </div>
      
      <HomeworkForm subjects={allSubjects} />
    </div>
  );
}
