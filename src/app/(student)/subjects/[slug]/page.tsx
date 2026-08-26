import { db } from "@/db";
import {
  subjects,
  enrollments,
  courseUnits,
  courseChapters,
  classSessions,
  homework,
  resources,
} from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getSubjectProgress,
  type SubjectProgress,
} from "@/features/subjects/queries";
import { ChapterCoverageToggle } from "@/features/subjects/components/chapter-coverage-toggle";
import { resolveCurrentStudent, requireAuth } from "@/lib/auth";
import { ContextHeader } from "@/components/shell/context-header";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  User,
  Calendar,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  ShieldAlert,
  FileCheck,
  ExternalLink,
  Presentation,
  Link2,
  FileArchive,
  Code,
  MapPin,
} from "lucide-react";
import { formatTime12h } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FilePreview } from "@/components/files/file-preview";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

const FILE_TYPE_STYLES: Record<string, { icon: LucideIcon; tint: string }> = {
  pdf: {
    icon: FileText,
    tint: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  slides: {
    icon: Presentation,
    tint: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  link: {
    icon: Link2,
    tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  zip: {
    icon: FileArchive,
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  code: {
    icon: Code,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  doc: {
    icon: FileText,
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
};

function fileTypeStyle(fileType: string) {
  return (
    FILE_TYPE_STYLES[fileType.trim().toLowerCase()] ?? {
      icon: FileText,
      tint: "bg-primary/10 text-primary border-primary/20",
    }
  );
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Document";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const SUBJECT_TABS = ["overview", "syllabus", "classes", "assignments", "resources"] as const;
type SubjectTabKey = (typeof SUBJECT_TABS)[number];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

// --- Per-tab data loaders ---------------------------------------------------
// Only one tab renders per request, so each slice is fetched independently.
// Orderings replicate the previous mega-query exactly.

function loadSubjectUnits(subjectId: string) {
  return db.query.courseUnits.findMany({
    where: eq(courseUnits.subjectId, subjectId),
    orderBy: [asc(courseUnits.order)],
    with: {
      courseChapters: {
        orderBy: [asc(courseChapters.order)],
        with: {
          courseMaterials: true,
        },
      },
    },
  });
}

function loadSubjectSessions(subjectId: string) {
  return db.query.classSessions.findMany({
    where: eq(classSessions.subjectId, subjectId),
    orderBy: [desc(classSessions.sessionDate)],
    with: {
      lectureLog: true,
    },
  });
}

function loadSubjectHomework(subjectId: string) {
  return db.query.homework.findMany({
    where: eq(homework.subjectId, subjectId),
    orderBy: [desc(homework.dueDate)],
  });
}

function loadSubjectResources(subjectId: string) {
  return db.query.resources.findMany({
    where: eq(resources.subjectId, subjectId),
    orderBy: [desc(resources.createdAt)],
    with: {
      chapter: true,
    },
  });
}

export default async function SubjectDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const activeTab: SubjectTabKey = SUBJECT_TABS.includes(tab as SubjectTabKey)
    ? (tab as SubjectTabKey)
    : "overview";
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);

  // 1. Resolve subject by human-readable slug first (base identity only —
  // heavy relations are fetched per-tab after the authorization wall).
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, slug),
    with: {
      teacher: true,
    },
  });

  // 2. Old-link compat: raw subject id in URL -> permanent redirect to slug URL
  if (!subject) {
    const legacy = await db.query.subjects.findFirst({
      where: eq(subjects.id, slug),
    });
    if (legacy) {
      permanentRedirect(`/subjects/${legacy.slug}`);
    }
    notFound();
  }

  // Strict Enrollment Authorization for Students — fail-closed: if the
  // student profile cannot be resolved, access is DENIED (never render).
  if (user.role === "STUDENT" || user.role === "CR") {
    const student = await resolveCurrentStudent();
    const enrollment = student
      ? await db.query.enrollments.findFirst({
          where: and(
            eq(enrollments.studentId, student.id),
            eq(enrollments.subjectId, subject.id)
          ),
        })
      : null;

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

  const canToggleCoverage = user.role === "TEACHER" || user.role === "ADMIN";

  // 3. Load only what the active tab needs. Runs AFTER the enrollment wall
  // above, so unauthorized students never trigger tab queries.
  let units: Awaited<ReturnType<typeof loadSubjectUnits>> = [];
  let sessions: Awaited<ReturnType<typeof loadSubjectSessions>> = [];
  let assignments: Awaited<ReturnType<typeof loadSubjectHomework>> = [];
  let subjectResources: Awaited<ReturnType<typeof loadSubjectResources>> = [];
  let progress: SubjectProgress | null = null;

  switch (activeTab) {
    case "overview": {
      progress = await getSubjectProgress(subject.id);
      break;
    }
    case "syllabus": {
      units = await loadSubjectUnits(subject.id);
      break;
    }
    case "classes": {
      sessions = await loadSubjectSessions(subject.id);
      break;
    }
    case "assignments": {
      assignments = await loadSubjectHomework(subject.id);
      break;
    }
    case "resources": {
      [subjectResources, units] = await Promise.all([
        loadSubjectResources(subject.id),
        loadSubjectUnits(subject.id),
      ]);
      break;
    }
  }

  // Chapter coverage counters — Overview reads them from getSubjectProgress;
  // Syllabus derives identical numbers from the already-fetched unit tree
  // (chapters scoped to this subject's units, covered = coveredAt set).
  let totalChapters = 0;
  let coveredChapters = 0;
  let progressPercent = 0;

  if (progress) {
    totalChapters = progress.totalChapters;
    coveredChapters = progress.coveredChapters;
    progressPercent =
      totalChapters > 0 ? Math.round((coveredChapters / totalChapters) * 100) : 0;
  } else if (activeTab === "syllabus") {
    totalChapters = units.reduce(
      (count, u) => count + u.courseChapters.length,
      0
    );
    coveredChapters = units.reduce(
      (count, u) =>
        count +
        u.courseChapters.filter((chap) => Boolean(chap.coveredAt)).length,
      0
    );
    progressPercent =
      totalChapters > 0 ? Math.round((coveredChapters / totalChapters) * 100) : 0;
  }

  // Extract all materials for the Resources tab
  const allMaterials = [
    ...subjectResources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || "Course study material & reference document.",
      fileUrl: r.fileUrl,
      fileType: r.fileType,
      fileSize: r.fileSize,
      groupLabel: r.chapter ? r.chapter.title : "General",
    })),
    ...units.flatMap((u) =>
      u.courseChapters.flatMap((c) =>
        c.courseMaterials.map((m) => ({
          id: m.id,
          title: m.title,
          description: `Chapter resource: ${c.title}`,
          fileUrl: m.fileUrl,
          fileType: m.fileType,
          fileSize: null,
          groupLabel: c.title,
        }))
      )
    ),
  ];

  return (
    <div className="flex-1 space-y-6 max-w-6xl mx-auto w-full">
      {/* Level-2 Context Header: breadcrumbs + back link + identity + URL tabs */}
      <ContextHeader
        crumbs={[
          { label: "My Subjects", href: "/subjects" },
          { label: subject.name },
        ]}
        backHref="/subjects"
        backLabel="My Subjects"
        title={subject.name}
        meta={
          <div className="flex flex-wrap items-center gap-2">
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
        }
        actions={
          <Link href={`/routine`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Calendar className="w-4 h-4 mr-2 text-primary" /> View Routine
          </Link>
        }
        activeTab={activeTab}
        tabTestIdPrefix="subject-tab"
        tabs={(
          [
            { key: "overview", label: "Overview" },
            { key: "syllabus", label: "Syllabus" },
            { key: "classes", label: "Classes" },
            { key: "assignments", label: "Assignments" },
            { key: "resources", label: "Resources" },
          ] as const
        ).map((t) => ({
          ...t,
          href: `/subjects/${slug}?tab=${t.key}`,
        }))}
      />

      {/* Overview */}
      {activeTab === "overview" && progress && (
        <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-2.5" data-testid="subject-overview-body">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {progress.currentChapter ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 max-w-full">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Currently on: {progress.currentChapter.unitTitle} — {progress.currentChapter.chapterTitle}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">
                Not started
              </span>
            )}
            <span className="text-xs text-muted-foreground font-semibold">
              {coveredChapters}/{totalChapters} chapters covered
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${progressPercent}% of chapters covered`}>
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
              {progressPercent}%
            </span>
          </div>

          <p className="pt-2 text-sm text-muted-foreground">
            Track this subject&apos;s syllabus progress, class history, assignments, and study materials from the tabs above.
          </p>
        </div>
      )}

      {/* Syllabus Progress */}
      {activeTab === "syllabus" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-foreground font-fira-sans">
                Curriculum & Unit Breakdown
              </h2>
              <span className="text-sm text-foreground/80 font-bold">
                {coveredChapters}/{totalChapters} Chapters Covered
              </span>
            </div>

            {units.length > 0 ? (
              <div className="space-y-4">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="p-4 rounded-xl border bg-muted/20 border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-foreground">
                        {unit.title}
                      </h3>
                      <span className="text-xs text-foreground/70 font-mono font-bold">
                        Unit {unit.order}
                      </span>
                    </div>

                    {unit.courseChapters.length > 0 && (
                      <div className="space-y-2 pl-3 border-l-2 border-primary">
                        {unit.courseChapters.map((chap) => {
                          const covered = Boolean(chap.coveredAt);
                          return (
                            <div
                              key={chap.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/40"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {covered ? (
                                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                                ) : (
                                  <Circle className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                                )}
                                <span
                                  className={cn(
                                    "font-semibold truncate",
                                    covered ? "text-foreground" : "text-muted-foreground"
                                  )}
                                >
                                  {chap.title}
                                </span>
                              </span>

                              <span className="flex items-center gap-3 mt-1 sm:mt-0 shrink-0">
                                {chap.courseMaterials.length > 0 && (
                                  <span className="text-primary font-bold text-xs flex items-center gap-1.5">
                                    <FileCheck className="w-3.5 h-3.5" />
                                    {chap.courseMaterials.length} Material{chap.courseMaterials.length === 1 ? "" : "s"} Attached
                                  </span>
                                )}
                                {canToggleCoverage && (
                                  <ChapterCoverageToggle
                                    chapterId={chap.id}
                                    covered={covered}
                                  />
                                )}
                              </span>
                            </div>
                          );
                        })}
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
        </div>
      )}

      {/* Classes: Session & Lecture Logs */}
      {activeTab === "classes" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-foreground font-fira-sans">
                Class History
              </h2>
              <span className="text-sm text-foreground/80 font-bold">
                {sessions.length} Recorded Session{sessions.length === 1 ? "" : "s"}
              </span>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session, idx) => {
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
                            Session #{sessions.length - idx}
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
        </div>
      )}

      {/* Assignments */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-foreground font-fira-sans">
                Subject Assignments & Tasks
              </h2>
              <Link
                href="/homework"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Go to Homework Hub →
              </Link>
            </div>

            {assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((hw) => {
                  const dueDateFormatted = formatNepaliDateTime(new Date(hw.dueDate));

                  const isCompleted = hw.status === "completed";

                  return (
                    <div
                      key={hw.id}
                      className="p-4 rounded-xl border bg-muted/10 border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-foreground">{hw.title}</h3>
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
        </div>
      )}

      {/* Resources — Units→Chapters accordion + ResourceList + FilePreview (read-only browser) */}
      {activeTab === "resources" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base text-foreground font-fira-sans">
                  Learning Materials & Lecture Slides
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Browse by Units → Chapters. Uses relations courseUnits → courseChapters → resources / courseMaterials. Read-only.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {allMaterials.length} File{allMaterials.length === 1 ? "" : "s"}
              </span>
            </div>

            {units.length === 0 && allMaterials.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground rounded-lg border border-dashed">
                Nothing here yet — study materials and lecture slides will appear once faculty uploads them.
              </div>
            ) : units.length === 0 ? (
              // Fallback flat grid when no syllabus units exist but legacy resources do
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allMaterials.map((mat) => {
                  const style = fileTypeStyle(mat.fileType);
                  const Icon = style.icon;
                  return (
                    <div
                      key={mat.id}
                      className="p-4 rounded-xl border bg-card border-border/40 flex flex-col gap-3 hover:border-primary/50 hover:bg-muted/20 transition-all shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase border",
                            style.tint
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {mat.fileType || "File"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border/60 truncate max-w-[55%]">
                          {mat.groupLabel}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground leading-snug">{mat.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{mat.description}</p>
                      <FilePreview fileUrl={mat.fileUrl} fileType={mat.fileType} title={mat.title} />
                      <div className="flex items-center justify-between text-xs border-t border-border/30 pt-3">
                        <span className="text-muted-foreground font-medium">{formatFileSize(mat.fileSize)}</span>
                        <a
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs gap-1 cursor-pointer" })}
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Accordion className="rounded-xl border divide-y bg-card">
                {units.map((unit) => (
                  <AccordionItem key={unit.id} value={unit.id} className="px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <span className="flex items-center gap-2 text-left">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {unit.order}
                        </span>
                        <span className="font-semibold text-sm">{unit.title}</span>
                        <span className="text-xs text-muted-foreground">({unit.courseChapters.length} chapters)</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {unit.courseChapters.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No chapters in this unit.</p>
                      ) : (
                        <div className="space-y-4">
                          {unit.courseChapters.map((chapter) => {
                            const chapterResources = subjectResources.filter((r) => r.chapterId === chapter.id);
                            const chapterMaterials = chapter.courseMaterials ?? [];
                            const combined = [
                              ...chapterResources.map((r) => ({
                                id: r.id,
                                title: r.title,
                                fileUrl: r.fileUrl,
                                fileType: r.fileType,
                                description: r.description,
                                fileSize: r.fileSize,
                              })),
                              ...chapterMaterials.map((m) => ({
                                id: m.id,
                                title: m.title,
                                fileUrl: m.fileUrl,
                                fileType: m.fileType,
                                description: `Chapter resource: ${chapter.title}` as string | null,
                                fileSize: null as number | null,
                              })),
                            ];
                            return (
                              <div key={chapter.id} className="rounded-lg border bg-muted/20 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold">{chapter.title}</h4>
                                  <span className="text-xs text-muted-foreground">
                                    {combined.length} file{combined.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                                {combined.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">No materials in this chapter yet.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {combined.map((item) => {
                                      const style = fileTypeStyle(item.fileType);
                                      const Icon = style.icon;
                                      return (
                                        <div
                                          key={item.id}
                                          className="rounded-lg border bg-card p-3 space-y-2 shadow-sm"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span
                                              className={cn(
                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase border",
                                                style.tint
                                              )}
                                            >
                                              <Icon className="w-3.5 h-3.5" />
                                              {item.fileType || "File"}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-medium">
                                              {formatFileSize(item.fileSize)}
                                            </span>
                                          </div>
                                          <h5 className="font-semibold text-sm text-foreground leading-snug">{item.title}</h5>
                                          {item.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                          )}
                                          <FilePreview fileUrl={item.fileUrl} fileType={item.fileType} title={item.title} />
                                          <div className="flex justify-end">
                                            <a
                                              href={item.fileUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs gap-1 cursor-pointer" })}
                                            >
                                              <ExternalLink className="w-3 h-3" /> Open
                                            </a>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* General bucket — resources without chapter */}
            {(() => {
              const general = subjectResources.filter((r) => !r.chapterId);
              if (general.length === 0) return null;
              return (
                <div className="mt-6 space-y-3 border-t pt-6">
                  <h3 className="font-semibold text-sm">General (Unchaptered)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {general.map((r) => {
                      const style = fileTypeStyle(r.fileType);
                      const Icon = style.icon;
                      return (
                        <div key={r.id} className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase border", style.tint)}>
                            <Icon className="w-3.5 h-3.5" /> {r.fileType}
                          </span>
                          <h4 className="font-semibold text-sm">{r.title}</h4>
                          <FilePreview fileUrl={r.fileUrl} fileType={r.fileType} title={r.title} />
                          <div className="flex justify-end pt-1">
                            <a href={r.fileUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs gap-1 cursor-pointer" })}>
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
