import { db } from "@/db";
import { classSessions, courseUnits, enrollments, studentProfiles, subjects } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireAuth, resolveCurrentStudent } from "@/lib/auth";
import { toRoman } from "@/lib/utils/roman";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime12h } from "@/lib/timezone";
import { FileText, Calendar, Clock, Search, X } from "lucide-react";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; subject?: string; semester?: string; date?: string; unit?: string }>;
};

// Shared styling for the filter row selects (subject / semester / unit).
const filterSelectClass = "h-9 rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-xs cursor-pointer";

// Kathmandu calendar day (YYYY-MM-DD) used to pin sessions to a specific date.
const nptDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function LectureLogsPage({ searchParams }: Props) {
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);
  void user;
  const { q = "", subject = "", semester = "", date = "", unit = "" } = await searchParams;
  const student = await resolveCurrentStudent();

  let enrolledSubjectIds: string[] = [];

  // subjectId -> distinct enrollment semesters, used by the semester filter.
  const semestersBySubjectId = new Map<string, Set<number>>();

  if (student) {
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
    });
    enrolledSubjectIds = userEnrollments.map((e) => e.subjectId);
    for (const enrollment of userEnrollments) {
      const semesters = semestersBySubjectId.get(enrollment.subjectId) ?? new Set<number>();
      semesters.add(enrollment.semester);
      semestersBySubjectId.set(enrollment.subjectId, semesters);
    }

    if (enrolledSubjectIds.length === 0 && user?.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.id, user.studentProfileId),
      });
      if (profile && profile.semester != null) {
        const semesterRoman = toRoman(profile.semester);
        const mappedSubjects = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.semester, semesterRoman));
        enrolledSubjectIds = mappedSubjects.map((s) => s.id);
      }
    }
  } else {
    // Teachers/admins have no student profile: derive semester options from every enrollment.
    const allEnrollments = await db
      .select({ subjectId: enrollments.subjectId, semester: enrollments.semester })
      .from(enrollments);
    for (const enrollment of allEnrollments) {
      const semesters = semestersBySubjectId.get(enrollment.subjectId) ?? new Set<number>();
      semesters.add(enrollment.semester);
      semestersBySubjectId.set(enrollment.subjectId, semesters);
    }
  }

  const allSessions = await db.query.classSessions.findMany({
    where: enrolledSubjectIds.length > 0
      ? inArray(classSessions.subjectId, enrolledSubjectIds)
      : undefined,
    with: {
      subject: true,
      lectureLog: true,
    },
    orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
  });

  // Subject filter options derive from the caller's own scoped history.
  const availableSubjects = Array.from(
    new Map(
      allSessions
        .filter((s) => s.subject)
        .map((s) => [s.subject.id, { id: s.subject.id, name: s.subject.name, code: s.subject.code }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Semester options: only semesters actually reachable within this caller's scoped history.
  const availableSemesters = Array.from(
    new Set(allSessions.flatMap((session) => Array.from(semestersBySubjectId.get(session.subjectId) ?? [])))
  ).sort((a, b) => a - b);

  // Unit options for subjects present in the scoped history (with chapter titles).
  const scopedSubjectIds = availableSubjects.map((subjectOption) => subjectOption.id);
  const unitRows =
    scopedSubjectIds.length > 0
      ? await db.query.courseUnits.findMany({
          where: inArray(courseUnits.subjectId, scopedSubjectIds),
          with: { courseChapters: true },
        })
      : [];
  const unitOptions = unitRows
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((unitRow) => ({
      id: unitRow.id,
      subjectId: unitRow.subjectId,
      title: unitRow.title,
      chapterTitles: [...unitRow.courseChapters]
        .sort((a, b) => a.order - b.order)
        .map((chapter) => chapter.title),
    }));

  // Text search covers subject name and everything faculty logged.
  const needle = q.trim().toLowerCase();
  const selectedSemester = /^\d+$/.test(semester) ? Number.parseInt(semester, 10) : null;
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  const hasFilters = Boolean(needle || subject || semester || date || unit);

  const filtered = hasFilters
    ? allSessions.filter((session) => {
        if (subject && session.subject?.id !== subject) return false;

        // Semester passes when that subject was ever enrolled at this semester.
        if (selectedSemester !== null && !semestersBySubjectId.get(session.subjectId)?.has(selectedSemester)) {
          return false;
        }

        // Date passes when the session's Kathmandu calendar day equals the input.
        if (selectedDate && nptDayFormatter.format(new Date(session.sessionDate)) !== selectedDate) {
          return false;
        }

        if (unit) {
          const selectedUnit = unitOptions.find((unitOption) => unitOption.id === unit);
          // NOTE: units have no FK to class sessions, so matching is textual:
          // a session counts toward a unit only when its logged text mentions
          // the unit title or any of that unit's chapter titles.
          if (!selectedUnit || session.subject?.id !== selectedUnit.subjectId) return false;
          const loggedText = [
            session.lectureLog?.topicsCovered,
            session.lectureLog?.notes,
            session.lectureLog?.homework,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const unitNeedles = [selectedUnit.title, ...selectedUnit.chapterTitles]
            .map((title) => title.trim().toLowerCase())
            .filter(Boolean);
          if (!unitNeedles.some((needleText) => loggedText.includes(needleText))) return false;
        }

        if (!needle) return true;
        const haystack = [
          session.subject?.name,
          session.lectureLog?.topicsCovered,
          session.lectureLog?.notes,
          session.lectureLog?.homework,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
    : allSessions;

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Class History</h2>
        <p className="text-muted-foreground text-sm max-w-2xl">Review syllabus coverage and topics covered in previous lectures.</p>
      </div>

      {/* Search & Filter */}
      <form data-testid="history-filters" className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search topics, notes, homework…"
            aria-label="Search class history"
            data-testid="history-search"
            className="pl-9 rounded-xl"
          />
        </div>
        <select
          name="subject"
          defaultValue={subject}
          aria-label="Filter by subject"
          data-testid="history-subject"
          className={filterSelectClass}
        >
          <option value="">All subjects</option>
          {availableSubjects.map((subjectOption) => (
            <option key={subjectOption.id} value={subjectOption.id}>
              {subjectOption.name} ({subjectOption.code})
            </option>
          ))}
        </select>
        <select
          name="semester"
          defaultValue={semester}
          aria-label="Filter by semester"
          data-testid="history-semester"
          className={filterSelectClass}
        >
          <option value="">All semesters</option>
          {availableSemesters.map((semesterOption) => (
            <option key={semesterOption} value={String(semesterOption)}>
              Semester {semesterOption}
            </option>
          ))}
        </select>
        <Input
          type="date"
          name="date"
          defaultValue={date}
          aria-label="Filter by date"
          data-testid="history-date"
          className="h-9 w-auto rounded-xl border-input bg-card px-3 text-sm shadow-xs"
        />
        <select
          name="unit"
          defaultValue={unit}
          aria-label="Filter by unit"
          data-testid="history-unit"
          className={filterSelectClass}
        >
          <option value="">All units</option>
          {unitOptions.map((unitOption) => (
            <option key={unitOption.id} value={unitOption.id}>
              {unitOption.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          data-testid="history-filter-btn"
          className={buttonVariants({ variant: "default", size: "sm", className: "gap-1.5 rounded-xl shrink-0" })}
        >
          <Search className="w-4 h-4" /> Filter
        </button>
        {hasFilters && (
          <Link
            href="/lecture-logs"
            data-testid="history-clear-btn"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "gap-1 rounded-xl shrink-0 text-muted-foreground hover:text-foreground",
            })}
          >
            <X className="w-4 h-4" /> Clear
          </Link>
        )}
      </form>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            {hasFilters
              ? "No classes match your search or filter."
              : "No lecture logs available yet."}
          </div>
        ) : (
          filtered.map((session) => (
            <Link
              href={`/sessions/${session.id}`}
              key={session.id}
              className="group block p-5 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-semibold">{session.subject?.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatNepaliDate(new Date(session.sessionDate))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime12h(session.startTime)} - {formatTime12h(session.endTime)}
                    </div>
                  </div>
                </div>

                <div className="flex-[2] md:border-l md:pl-6 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground text-xs uppercase tracking-wider block mb-1">Topics</span>
                  <p className="line-clamp-2">
                    {session.lectureLog?.topicsCovered || <span className="italic opacity-50">No topics logged.</span>}
                  </p>
                </div>

                <div className="shrink-0 pt-2 md:pt-0">
                  <div className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full md:w-auto text-muted-foreground group-hover:text-foreground" })}>
                    <FileText className="w-4 h-4 mr-2" /> View Session
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
