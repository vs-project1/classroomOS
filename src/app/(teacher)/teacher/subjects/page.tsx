import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, homework, courseUnits, resources } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { BookOpen, Layers, ClipboardList, FolderOpen, ArrowRight, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TeacherSubjectsPage({ searchParams }: Props) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  const resolvedParams = await searchParams;
  const semester = typeof resolvedParams.semester === "string" ? resolvedParams.semester : null;

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">My Subjects</h1>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  const conditions = [eq(subjects.teacherId, user.teacherId)];
  if (semester) {
    conditions.push(eq(subjects.semester, semester));
  }

  // Strictly filter by this teacher's ID
  const teacherSubjects = await db.query.subjects.findMany({
    where: and(...conditions),
    with: {
      courseUnits: true,
      homework: { where: eq(homework.status, "active") },
      resources: true,
    },
  });

  const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          {semester && (
            <Link href="/teacher/subjects" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">
            {semester ? `Semester ${semester} Subjects` : "My Subjects"}
          </h1>
        </div>
        <p className="text-muted-foreground text-base max-w-2xl">
          {semester 
            ? `Manage your assigned classes, track active assignments, and organize study materials for Semester ${semester}.`
            : "Select a semester to view and manage your assigned classes."}
        </p>
      </div>

      {!semester ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SEMESTERS.map((sem) => (
            <Link
              key={sem}
              href={`/teacher/subjects?semester=${sem}`}
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
      ) : teacherSubjects.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-border/50 rounded-3xl bg-muted/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No subjects assigned</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm leading-relaxed">
            You haven't been assigned any subjects for Semester {semester} yet. An administrator needs to link you to a subject in the system.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teacherSubjects.map((subject) => (
            <Link 
              href={`/subjects/${subject.slug}`} 
              key={subject.id}
              className="group flex flex-col bg-card border rounded-3xl overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300"
            >
              <div className="p-6 md:p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
                    <BookOpen className="w-7 h-7 text-primary" />
                  </div>
                  <span className="font-fira-code text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-full border border-border">
                    {subject.code}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold font-fira-sans tracking-tight mb-2 group-hover:text-primary transition-colors">
                  {subject.name}
                </h2>
                
                <div className="flex gap-4 mt-8">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Units</span>
                    </div>
                    <span className="text-lg font-bold">{subject.courseUnits.length}</span>
                  </div>
                  
                  <div className="w-px bg-border"></div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ClipboardList className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Active HW</span>
                    </div>
                    <span className="text-lg font-bold">{subject.homework.length}</span>
                  </div>

                  <div className="w-px bg-border"></div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FolderOpen className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Files</span>
                    </div>
                    <span className="text-lg font-bold">{subject.resources.length}</span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 md:px-8 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  Manage syllabus & grades
                </span>
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
