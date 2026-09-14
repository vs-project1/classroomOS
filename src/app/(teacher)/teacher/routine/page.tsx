import { CalendarDays, Layers } from "lucide-react";
import Link from "next/link";
import { requireAuth, getPermissions } from "@/lib/auth";
import { RoutineView } from "@/components/timetable/routine-view";
import { getTeacherWeeklyRoutine } from "@/features/routine/queries";
import { areSemestersEqual } from "@/lib/utils/roman";

export const dynamic = "force-dynamic";

const ROMAN_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TeacherRoutinePage({ searchParams }: Props) {
  // RBAC Guard: Strictly require TEACHER role
  const user = await requireAuth(["TEACHER"]);
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-2xl font-bold font-fira-sans tracking-tight text-foreground">My Routine</h1>
        <div className="p-4 bg-destructive/10 text-destructive-foreground rounded-xl border border-destructive/20 text-xs font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  const rawRoutine = await getTeacherWeeklyRoutine(user.teacherId);

  // Extract distinct semesters taught by this teacher
  const taughtSemesters = Array.from(
    new Set(rawRoutine.map((r) => r.subject?.semester).filter(Boolean))
  ) as string[];
  taughtSemesters.sort((a, b) => ROMAN_ORDER.indexOf(a) - ROMAN_ORDER.indexOf(b));

  const selectedSemester =
    typeof resolvedParams.semester === "string"
      ? resolvedParams.semester
      : "All";

  const allRoutine = rawRoutine.filter((r) => {
    if (selectedSemester === "All") return true;
    return areSemestersEqual(r.subject?.semester, selectedSemester);
  });

  const hasRoutine = allRoutine.length > 0;

  // Current NPT time formatted as 24h string ("HH:mm") for accurate routine slot status
  const nptTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const nptWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
  }).format(new Date());
  const todayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nptWeekday);

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-bold font-fira-sans tracking-tight text-foreground">
            My Teaching Routine
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Your personalized weekly schedule across all assigned subject lectures and lab sessions.
          </p>
        </div>
      </div>

      {/* Semester Filter Tabs (if teacher has subjects across semesters) */}
      {rawRoutine.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Semester:</span>
          </div>

          <Link
            href="/teacher/routine?semester=All"
            className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedSemester === "All"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <span>All Semesters</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedSemester === "All"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {rawRoutine.length}
            </span>
          </Link>

          {taughtSemesters.map((sem) => {
            const isActive = selectedSemester === sem;
            const count = rawRoutine.filter((r) => areSemestersEqual(r.subject?.semester, sem)).length;

            return (
              <Link
                key={sem}
                href={`/teacher/routine?semester=${sem}`}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                <span>Semester {sem}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Timetable Content */}
      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-card/50">
          <div className="h-14 w-14 bg-muted/40 rounded-full flex items-center justify-center mb-1 text-muted-foreground">
            <CalendarDays className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-semibold font-fira-sans tracking-tight">
            {selectedSemester !== "All"
              ? `No Classes in Semester ${selectedSemester}`
              : "No Classes Scheduled"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {selectedSemester !== "All"
              ? `You don't have any scheduled classes for Semester ${selectedSemester}. Switch to "All Semesters" to see your full timetable.`
              : "You don't have any classes scheduled in the routine system yet."}
          </p>
        </div>
      ) : (
        <RoutineView
          allRoutines={allRoutine}
          todayIndex={todayIndex < 0 ? 0 : todayIndex}
          nptTime={nptTime}
          canManageRoutine={permissions.canManageRoutine}
          viewRole="TEACHER"
        />
      )}
    </div>
  );
}
