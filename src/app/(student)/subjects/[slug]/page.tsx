import { db } from "@/db";
import {
  subjects,
  enrollments,
  courseUnits,
  classSessions,
  homework,
  resources,
  studentProfiles,
} from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getSubjectProgress,
  type SubjectProgress,
} from "@/features/subjects/queries";
import { resolveCurrentStudent, requireAuth } from "@/lib/auth";
import { ContextHeader } from "@/components/shell/context-header";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { User, Calendar, ShieldAlert } from "lucide-react";
import { toRoman } from "@/lib/utils/roman";
import { AddUnitDialog } from "@/features/subjects/components/add-unit-dialog";
import {
  OverviewTab,
  SyllabusTab,
  ClassesTab,
  AssignmentsTab,
  ResourcesTab,
} from "@/features/subjects/components/tabs";

export const dynamic = "force-dynamic";

const SUBJECT_TABS = [
  "overview",
  "syllabus",
  "classes",
  "assignments",
  "resources",
] as const;
type SubjectTabKey = (typeof SUBJECT_TABS)[number];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; unit?: string }>;
};

// --- Per-tab data loaders ---------------------------------------------------
// Only one tab renders per request, so each slice is fetched independently.
// Orderings replicate the previous mega-query exactly.

function loadSubjectUnits(subjectId: string) {
  return db.query.courseUnits.findMany({
    where: eq(courseUnits.subjectId, subjectId),
    orderBy: [asc(courseUnits.order)],
    with: {
      resources: {
        orderBy: (res, { desc }) => [desc(res.createdAt)],
      },
      courseChapters: {
        orderBy: [asc(courseUnits.order)],
        with: {
          courseMaterials: true,
          resources: {
            orderBy: (res, { desc }) => [desc(res.createdAt)],
          },
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
      unit: true,
      chapter: true,
    },
  });
}

export default async function SubjectDetailPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const { tab, unit: unitParam } = await searchParams;
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

    let isAllowedBySemester = false;
    if (!enrollment && user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile && profile.semester != null) {
        const semesterRoman = toRoman(profile.semester);
        if (subject.semester === semesterRoman) {
          isAllowedBySemester = true;
        }
      }
    }

    if (!enrollment && !isAllowedBySemester) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 border border-destructive/20 rounded-2xl bg-destructive/5 max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            403 - Access Denied
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            You are not enrolled in{" "}
            <strong className="text-foreground">
              {subject.name} ({subject.code})
            </strong>
            . This subject is restricted to enrolled cohort students.
          </p>
          <Link
            href="/subjects"
            className={buttonVariants({ variant: "outline" })}
          >
            ← Back to My Subjects
          </Link>
        </div>
      );
    }
  }

  const canToggleCoverage = user.role === "TEACHER" || user.role === "ADMIN";
  const isEditor =
    user.role === "ADMIN" ||
    (user.role === "TEACHER" && subject.teacherId === user.teacherId);

  const backHref =
    user.role === "TEACHER"
      ? "/teacher/subjects"
      : user.role === "ADMIN"
        ? "/admin/subjects"
        : "/subjects";

  const backLabel =
    user.role === "TEACHER"
      ? "Assigned Subjects"
      : user.role === "ADMIN"
        ? "All Subjects"
        : "My Subjects";

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
  let totalChapters = 0;
  let coveredChapters = 0;
  let progressPercent = 0;

  if (progress) {
    totalChapters = progress.totalChapters;
    coveredChapters = progress.coveredChapters;
    progressPercent =
      totalChapters > 0
        ? Math.round((coveredChapters / totalChapters) * 100)
        : 0;
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
      totalChapters > 0
        ? Math.round((coveredChapters / totalChapters) * 100)
        : 0;
  }

  // Extract all materials for the Resources tab
  const allMaterials = [
    ...subjectResources.map((r) => ({
      id: r.id,
      title: r.title,
      description:
        r.description || "Course study material & reference document.",
      fileUrl: r.fileUrl,
      fileType: r.fileType,
      fileSize: r.fileSize,
      groupLabel: r.chapter
        ? r.chapter.title
        : r.unit
          ? r.unit.title
          : "General",
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
          { label: backLabel, href: backHref },
          { label: subject.name },
        ]}
        backHref={backHref}
        backLabel={backLabel}
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
          <div className="flex items-center gap-2">
            {isEditor && <AddUnitDialog subjectId={subject.id} />}
            <Link
              href={`/routine`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Calendar className="w-4 h-4 mr-2 text-primary" /> View Routine
            </Link>
          </div>
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

      {activeTab === "overview" && (
        <OverviewTab
          progress={progress}
          progressPercent={progressPercent}
          coveredChapters={coveredChapters}
          totalChapters={totalChapters}
        />
      )}

      {activeTab === "syllabus" && (
        <SyllabusTab
          units={units}
          coveredChapters={coveredChapters}
          totalChapters={totalChapters}
          subject={subject}
          slug={slug}
          isEditor={isEditor}
          canToggleCoverage={canToggleCoverage}
        />
      )}

      {activeTab === "classes" && (
        <ClassesTab sessions={sessions} />
      )}

      {activeTab === "assignments" && (
        <AssignmentsTab assignments={assignments} />
      )}

      {activeTab === "resources" && (
        <ResourcesTab
          units={units}
          subjectResources={subjectResources}
          allMaterials={allMaterials}
          subject={subject}
          slug={slug}
          isEditor={isEditor}
          unitParam={unitParam}
        />
      )}
    </div>
  );
}
