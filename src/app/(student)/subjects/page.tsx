import { db } from "@/db";
import { enrollments, subjects, homework, resources, courseUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveCurrentStudent, requireAuth } from "@/lib/auth";
import Link from "next/link";
import { toRoman } from "@/lib/utils/roman";
import { studentProfiles } from "@/db/schema";
import { BookOpen, User, ArrowRight, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);
  const student = await resolveCurrentStudent();

  let enrolledSubjects: Array<{
    id: string;
    name: string;
    slug: string;
    code: string;
    teacherName: string;
    unitCount: number;
    activeHwCount: number;
    resourceCount: number;
  }> = [];

  if (student && user.studentProfileId) {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });

    // 1. Try querying explicit student enrollments
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
      with: {
        subject: {
          with: {
            teacher: true,
            courseUnits: true,
            homework: { where: eq(homework.status, "active") },
            resources: true,
          },
        },
      },
    });

    if (userEnrollments.length > 0) {
      enrolledSubjects = userEnrollments
        .filter((e) => e.subject != null)
        .map((e) => ({
          id: e.subject.id,
          name: e.subject.name,
          slug: e.subject.slug,
          code: e.subject.code,
          teacherName: e.subject.teacher?.name || "Faculty Member",
          unitCount: e.subject.courseUnits?.length || 0,
          activeHwCount: e.subject.homework?.length || 0,
          resourceCount: e.subject.resources?.length || 0,
        }));
    } else if (profile && profile.semester != null) {
      // 2. Dynamic Fallback: fetch subjects matching the student's semester
      const semesterRoman = toRoman(profile.semester);
      const semesterSubjects = await db.query.subjects.findMany({
        where: eq(subjects.semester, semesterRoman),
        with: {
          teacher: true,
          courseUnits: true,
          homework: { where: eq(homework.status, "active") },
          resources: true,
        },
      });

      enrolledSubjects = semesterSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        code: s.code,
        teacherName: s.teacher?.name || "Faculty Member",
        unitCount: s.courseUnits?.length || 0,
        activeHwCount: s.homework?.length || 0,
        resourceCount: s.resources?.length || 0,
      }));
    }
  }

  // Security: STUDENT/CR are strictly enrollment-scoped. An unresolvable
  // student profile or zero enrollments yields an empty grid — never the full
  // catalog (audit: this page previously leaked every subject as a fallback,
  // the same leak class fixed for the sidebar in features/subjects/queries.ts).
  // TEACHER/ADMIN intentionally browse the full catalog.
  if (
    enrolledSubjects.length === 0 &&
    (user.role === "TEACHER" || user.role === "ADMIN")
  ) {
    const allSubjects = await db.query.subjects.findMany({
      with: {
        teacher: true,
        courseUnits: true,
        homework: { where: eq(homework.status, "active") },
        resources: true,
      },
    });

    enrolledSubjects = allSubjects.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      code: s.code,
      teacherName: s.teacher?.name || "Faculty Member",
      unitCount: s.courseUnits?.length || 0,
      activeHwCount: s.homework?.length || 0,
      resourceCount: s.resources?.length || 0,
    }));
  }

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="pb-6 border-b border-border/40">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Subjects
          </h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Access your syllabus units, class lecture logs, assignments, and faculty learning materials.
        </p>
      </div>

      {/* Subjects Grid */}
      {enrolledSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Subjects Yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You are not enrolled in any subjects yet.
          </p>
          <Link
            href="/today"
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm"
          >
            Back to Today
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolledSubjects.map((subj) => (
          <Link
            key={subj.id}
            href={`/subjects/${subj.slug}`}
            data-testid="subject-card"
            className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-card-foreground cursor-pointer"
          >
            <div>
              {/* Code badge & Unit count */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">
                  {subj.code}
                </span>
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {subj.unitCount} Unit{subj.unitCount === 1 ? "" : "s"}
                </span>
              </div>

              {/* Subject Title */}
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                {subj.name}
              </h3>

              {/* Faculty Info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-4">
                <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{subj.teacherName}</span>
              </div>
            </div>

            {/* Bottom Meta & Action */}
            <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-muted-foreground font-medium">
                <span>{subj.activeHwCount} Assignment{subj.activeHwCount === 1 ? "" : "s"}</span>
                <span>•</span>
                <span>{subj.resourceCount} Material{subj.resourceCount === 1 ? "" : "s"}</span>
              </div>
              <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
        </div>
      )}
    </div>
  );
}
