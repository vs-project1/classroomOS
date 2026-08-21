import { db } from "@/db";
import { RoutineForm } from "../routine-form";
import { asc } from "drizzle-orm";
import { subjects } from "@/db/schema";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewRoutinePage() {
  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
  });

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/routine" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Add Routine Entry</h2>
          <p className="text-muted-foreground text-sm">Schedule a new weekly recurring subject time slot.</p>
        </div>
      </div>
      
      <RoutineForm subjects={allSubjects} />
    </div>
  );
}
