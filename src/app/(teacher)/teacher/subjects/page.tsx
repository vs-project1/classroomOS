import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, homework, courseUnits, resources } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { BookOpen, Layers, ClipboardList, FolderOpen, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherSubjectsPage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

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

  // Strictly filter by this teacher's ID
  const teacherSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, user.teacherId),
    with: {
      courseUnits: true,
      homework: { where: eq(homework.status, "active") },
      resources: true,
    },
  });

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">
          My Subjects
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          Manage your assigned classes, track active assignments, and organize study materials.
        </p>
      </div>

      {teacherSubjects.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-border/50 rounded-3xl bg-muted/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No subjects assigned</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            You are not currently assigned as a teacher for any subjects. Reach out to an admin to adjust your course load.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherSubjects.map((subject) => {
            const activeHw = subject.homework?.length || 0;
            const resCount = subject.resources?.length || 0;
            const unitCount = subject.courseUnits?.length || 0;

            return (
              <Link
                key={subject.id}
                href={`/subjects/${subject.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex h-8 items-center rounded-full bg-primary/10 px-3 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20">
                      {subject.code}
                    </span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                  </div>
                  <div>
                    <h2 className="font-fira-sans text-xl font-bold leading-tight text-foreground line-clamp-2">
                      {subject.name}
                    </h2>
                  </div>
                </div>

                <div className="relative z-10 mt-8 grid grid-cols-3 gap-4 border-t border-border/40 pt-4">
                  <div className="flex flex-col items-center gap-1">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{unitCount}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{activeHw}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{resCount}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
