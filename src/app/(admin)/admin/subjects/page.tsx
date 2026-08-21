import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import Link from "next/link";
import { SubjectForm } from "./subject-form";
import { asc } from "drizzle-orm";
import { BookOpen, Search, ArrowRight, LibraryBig, BookCopy, Fingerprint } from "lucide-react";
import { getPermissions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const permissions = await getPermissions();
  const [allSubjects, allTeachers] = await Promise.all([
    db.query.subjects.findMany({
      orderBy: [asc(subjects.name)],
      with: { teacher: true }
    }),
    db.select().from(teachers).orderBy(asc(teachers.name))
  ]);

  const hasSubjects = allSubjects.length > 0;

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Subjects</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Manage your enrolled BCA course units, credit distribution, syllabus breakdowns, and faculty contacts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasSubjects && (
            <button className="text-xs font-medium px-3 py-1.5 bg-muted text-muted-foreground hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1" title="Total registered academic workload across theory modules and mandatory lab courses for Semester 4.">
              <LibraryBig className="w-3.5 h-3.5" /> 22 Credit Hours
            </button>
          )}
          {permissions.canManageSubjects && (
            <div className="flex items-center">
              <SubjectForm teachers={allTeachers} />
            </div>
          )}
        </div>
      </div>

      {!hasSubjects ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <BookCopy className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Subjects Assigned</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You are not currently registered in any course modules for this term. Select your current semester core subjects and practical lab electives to launch your workspace.
          </p>
          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm">
              Browse Course Catalog
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors">
              Contact Academic Advisor
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allSubjects.map((subject) => {
            const hasLab = subject.name.toLowerCase().includes('lab') || subject.name.toLowerCase().includes('practical');
            
            return (
              <div key={subject.id} className="group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative">
                {/* Accent border top */}
                <div className="h-1 w-full bg-primary/20 group-hover:bg-primary transition-colors absolute top-0 left-0" />
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-fira-code text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded">
                      {subject.code}
                    </span>
                    {hasLab && (
                      <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20" title="This course features mandatory weekly hands-on programming assignments and practical viva evaluations.">
                        Lab Included
                      </span>
                    )}
                  </div>
                  
                  <Link href={`/admin/subjects/${subject.id}`} className="block mb-2 cursor-pointer">
                    <h3 className="text-lg font-bold font-fira-sans text-foreground group-hover:text-primary transition-colors leading-tight">
                      {subject.name}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground font-medium">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-secondary-foreground/10">
                      <span className="text-xs font-bold text-secondary-foreground">{subject.teacher?.name?.[0] || "?"}</span>
                    </div>
                    <span className="truncate">{subject.teacher?.name || "Faculty Unassigned"}</span>
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-border/50 bg-muted/5 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5" title="View module-by-module topic breakdown, prescribed textbooks, and internal evaluation weightages.">
                    <Fingerprint className="w-3.5 h-3.5" /> Inspect Syllabus Breakdown
                  </span>
                  <Link href={`/admin/subjects/${subject.id}`} className="w-8 h-8 rounded-full bg-background border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all duration-300 cursor-pointer shadow-sm">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
