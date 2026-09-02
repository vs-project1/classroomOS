import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import Link from "next/link";
import { SubjectForm } from "@/features/subjects/components/subject-form";
import { asc, eq } from "drizzle-orm";
import { BookOpen, Search, ArrowRight, LibraryBig, BookCopy, Fingerprint, ArrowLeft } from "lucide-react";
import { getPermissions } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SubjectsPage({ searchParams }: Props) {
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;
  const semester = typeof resolvedParams.semester === "string" ? resolvedParams.semester : null;

  const [allSubjects, allTeachers] = await Promise.all([
    db.query.subjects.findMany({
      where: semester ? eq(subjects.semester, semester) : undefined,
      orderBy: [asc(subjects.name)],
      with: { teacher: true }
    }),
    db.select().from(teachers).orderBy(asc(teachers.name))
  ]);

  const hasSubjects = allSubjects.length > 0;
  const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            {semester && (
              <Link href="/admin/subjects" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">
              {semester ? `Semester ${semester} Subjects` : "Subjects"}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {semester 
              ? `Manage your enrolled BCA course units, credit distribution, and faculty contacts for Semester ${semester}.`
              : "Select a semester to view and manage its subjects and course units."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasSubjects && semester && (
            <button className="text-xs font-medium px-3 py-1.5 bg-muted text-muted-foreground hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1">
              <LibraryBig className="w-3.5 h-3.5" /> {allSubjects.length} Subjects
            </button>
          )}
          {permissions.canManageSubjects && (
            <div className="flex items-center">
              <SubjectForm teachers={allTeachers} />
            </div>
          )}
        </div>
      </div>

      {!semester ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SEMESTERS.map((sem) => (
            <Link
              key={sem}
              href={`/admin/subjects?semester=${sem}`}
              className="group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative p-6 h-32"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-fira-sans text-foreground">Semester {sem}</h3>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-sm text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View Subjects <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      ) : !hasSubjects ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <BookCopy className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Subjects Found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No academic modules have been registered for Semester {semester}. Create a new subject to populate this term's syllabus.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {allSubjects.map((subject) => (
            <Link key={subject.id} href={`/admin/subjects/${subject.slug}`} className="group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative">
              <div className="p-6 pb-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                      {subject.code}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {subject.name}
                </h3>
              </div>

              <div className="px-6 py-4 bg-muted/30 border-t border-border/40 mt-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-background border flex items-center justify-center shadow-sm">
                    {subject.teacher ? (
                      <span className="text-[10px] font-bold text-primary">{subject.teacher.name[0]}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">?</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground truncate max-w-[120px]">
                    {subject.teacher ? subject.teacher.name.split(' ')[0] : "Unassigned"}
                  </span>
                </div>
                <div className="flex items-center text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  Manage <ArrowRight className="ml-1 w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
