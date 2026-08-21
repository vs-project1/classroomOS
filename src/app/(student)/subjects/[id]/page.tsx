import { db } from "@/db";
import {
  subjects,
  enrollments,
  courseUnits,
  classSessions,
  homework,
  resources,
  courseMaterials,
} from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { resolveCurrentStudent, requireAuth } from "@/lib/auth";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  BookOpen,
  User,
  Calendar,
  Layers,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowLeft,
  Book,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { formatTime12h } from "@/lib/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SubjectDetailPage({ params }: Props) {
  const { id: subjectId } = await params;
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);

  // 1. Fetch Subject with all relations
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.id, subjectId),
    with: {
      teacher: true,
      courseUnits: {
        orderBy: [asc(courseUnits.order)],
        with: {
          courseChapters: {
            orderBy: [asc(courseUnits.order)],
            with: {
              courseMaterials: true,
            },
          },
        },
      },
      classSessions: {
        orderBy: [desc(classSessions.sessionDate)],
        with: {
          lectureLog: true,
          attendance: true,
        },
      },
      homework: {
        orderBy: [desc(homework.dueDate)],
      },
      resources: {
        orderBy: [desc(resources.createdAt)],
      },
    },
  });

  if (!subject) {
    notFound();
  }

  // 2. Strict Enrollment Authorization for Students
  if (user.role === "STUDENT" || user.role === "CR") {
    const student = await resolveCurrentStudent();
    if (student) {
      const enrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, student.id),
          eq(enrollments.subjectId, subjectId)
        ),
      });

      if (!enrollment) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 border border-destructive/20 rounded-2xl bg-destructive/5 max-w-lg mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">403 - Access Denied</h1>
            <p className="text-sm text-muted-foreground mb-6">
              You are not enrolled in <strong className="text-foreground">{subject.name} ({subject.code})</strong>. This subject is restricted to enrolled cohort students.
            </p>
            <Link href="/subjects" className={buttonVariants({ variant: "outline" })}>
              ← Back to My Subjects
            </Link>
          </div>
        );
      }
    }
  }

  // Extract all materials
  const allMaterials = [
    ...subject.resources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "Course study material & reference document.",
      fileUrl: r.fileUrl,
      fileType: r.fileType,
      fileSize: r.fileSize,
      date: r.createdAt,
    })),
    ...subject.courseUnits.flatMap((u) =>
      u.courseChapters.flatMap((c) =>
        c.courseMaterials.map((m) => ({
          id: m.id,
          title: m.title,
          description: `Chapter resource: ${c.title}`,
          fileUrl: m.fileUrl,
          fileType: m.fileType,
          fileSize: null,
          date: m.createdAt,
        }))
      )
    ),
  ];

  return (
    <div className="flex-1 space-y-6 max-w-6xl mx-auto w-full">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary mb-3 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Subjects
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
                {subject.code}
              </span>
              {subject.teacher && (
                <span className="text-sm text-foreground/80 flex items-center gap-1.5 font-semibold">
                  <User className="w-4 h-4 text-primary" />
                  {subject.teacher.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
              {subject.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/today`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Calendar className="w-4 h-4 mr-2 text-primary" /> View Routine
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Tabs Workspace */}
      <Tabs defaultValue="syllabus" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl">
          <TabsTrigger value="syllabus" className="py-3 font-bold text-sm cursor-pointer">
            <Layers className="w-4 h-4 mr-2" />
            Syllabus
          </TabsTrigger>
          <TabsTrigger value="sessions" className="py-3 font-bold text-sm cursor-pointer">
            <Clock className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="assignments" className="py-3 font-bold text-sm cursor-pointer">
            <Book className="w-4 h-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="resources" className="py-3 font-bold text-sm cursor-pointer">
            <FileText className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Syllabus Progress */}
        <TabsContent value="syllabus" className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-foreground font-fira-sans">
                Curriculum & Unit Breakdown
              </h3>
              <span className="text-sm text-foreground/80 font-bold">
                {subject.courseUnits.length} Unit{subject.courseUnits.length === 1 ? "" : "s"}
              </span>
            </div>

            {subject.courseUnits.length > 0 ? (
              <div className="space-y-4">
                {subject.courseUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-4 rounded-xl border bg-muted/20 border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-foreground">
                        {unit.title}
                      </h4>
                      <span className="text-xs text-foreground/70 font-mono font-bold">
                        Unit {unit.order}
                      </span>
                    </div>

                    {unit.courseChapters.length > 0 && (
                      <div className="space-y-2 pl-3 border-l-2 border-primary">
                        {unit.courseChapters.map((chap) => (
                          <div
                            key={chap.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/40"
                          >
                            <span className="font-semibold text-foreground">{chap.title}</span>
                            {chap.courseMaterials.length > 0 && (
                              <span className="text-primary font-bold text-xs flex items-center gap-1.5 mt-1 sm:mt-0">
                                <FileCheck className="w-3.5 h-3.5" />
                                {chap.courseMaterials.length} Material{chap.courseMaterials.length === 1 ? "" : "s"} Attached
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-foreground/80 rounded-lg border border-dashed">
                Syllabus outline and chapter topics will be published by faculty soon.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Sessions & Lecture Logs */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-foreground font-fira-sans">
                Class Sessions & Lecture Logs
              </h3>
              <span className="text-sm text-foreground/80 font-bold">
                {subject.classSessions.length} Recorded Session{subject.classSessions.length === 1 ? "" : "s"}
              </span>
            </div>

            {subject.classSessions.length > 0 ? (
              <div className="space-y-4">
                {subject.classSessions.map((session, idx) => {
                  const sDate = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Kathmandu",
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(session.sessionDate));

                  return (
                    <div
                      key={session.id}
                      className="p-5 rounded-2xl border bg-card border-border/80 space-y-3 hover:border-primary/50 transition-all shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary font-mono">
                            Session #{subject.classSessions.length - idx}
                          </span>
                          <span className="text-sm font-bold text-foreground">{sDate}</span>
                        </div>
                        <div className="text-sm text-foreground/80 flex items-center gap-1.5 font-semibold">
                          <Clock className="w-4 h-4 text-primary" />
                          {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                        </div>
                      </div>

                      {session.lectureLog ? (
                        <div className="space-y-2 pt-1">
                          <div>
                            <span className="text-sm font-bold text-foreground block mb-0.5">
                              Topics Covered:
                            </span>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                              {session.lectureLog.topicsCovered}
                            </p>
                          </div>

                          {session.lectureLog.notes && (
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                              <span className="font-bold text-amber-800 dark:text-amber-400 shrink-0">Notes:</span>
                              <span>{session.lectureLog.notes}</span>
                            </div>
                          )}

                          {session.lectureLog.homework && (
                            <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-start gap-2">
                              <span className="font-bold text-indigo-700 dark:text-indigo-400 shrink-0">Assigned Task:</span>
                              <span>{session.lectureLog.homework}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-1 text-xs text-foreground/70 font-medium">
                          Session conducted on schedule. No additional lecture notes.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground rounded-lg border border-dashed">
                No class sessions have been logged yet for this subject.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Assignments */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-foreground font-fira-sans">
                Subject Assignments & Tasks
              </h3>
              <Link
                href="/homework"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Go to Homework Hub →
              </Link>
            </div>

            {subject.homework.length > 0 ? (
              <div className="space-y-3">
                {subject.homework.map((hw) => {
                  const dueDateFormatted = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Kathmandu",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(hw.dueDate));

                  const isCompleted = hw.status === "completed";

                  return (
                    <div
                      key={hw.id}
                      className="p-4 rounded-xl border bg-muted/10 border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{hw.title}</h4>
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-md text-xs font-bold uppercase",
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                            )}
                          >
                            {hw.status}
                          </span>
                        </div>
                        {hw.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {hw.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-medium">
                          Due: {dueDateFormatted}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Link
                          href="/homework"
                          className={buttonVariants({ variant: "outline", size: "sm", className: "cursor-pointer" })}
                        >
                          Submit Work
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground rounded-lg border border-dashed">
                No active or upcoming assignments for this subject.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 4: Resources */}
        <TabsContent value="resources" className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-foreground font-fira-sans">
                  Learning Materials & Lecture Slides
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download syllabus slides, lab sheets, and reference materials uploaded by faculty.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {allMaterials.length} File{allMaterials.length === 1 ? "" : "s"}
              </span>
            </div>

            {allMaterials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-4 rounded-xl border bg-muted/10 border-border/40 flex flex-col justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                          {mat.fileType.toUpperCase() || "PDF"} Slides & Materials
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground leading-snug mb-1">
                        {mat.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {mat.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-xs font-medium">
                        {mat.fileSize ? `${Math.round(mat.fileSize / 1024)} KB` : "Document"}
                      </span>
                      <a
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs gap-1 cursor-pointer" })}
                      >
                        <Download className="w-3 h-3" /> Download Materials
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground rounded-lg border border-dashed">
                No resources or lecture slides have been uploaded yet.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
