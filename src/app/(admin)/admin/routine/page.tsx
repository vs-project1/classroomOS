import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit, CalendarRange } from "lucide-react";
import { getPermissions } from "@/lib/auth";
import { TimelineRiver, type TimelineRiverSlot } from "@/components/timetable/timeline-river";
import { DeleteRoutineButton } from "@/features/routine/components/delete-routine-button";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SEMESTERS = ["All", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function matchSemester(subSem: string | number | null | undefined, targetSem: string | null): boolean {
  if (!targetSem || targetSem === "All") return true;
  if (!subSem) return false;
  const str = String(subSem).toUpperCase().trim();
  const target = targetSem.toUpperCase().trim();

  const romanMap: Record<string, string[]> = {
    I: ["I", "1", "1ST"],
    II: ["II", "2", "2ND"],
    III: ["III", "3", "3RD"],
    IV: ["IV", "4", "4TH"],
    V: ["V", "5", "5TH"],
    VI: ["VI", "6", "6TH"],
    VII: ["VII", "7", "7TH"],
    VIII: ["VIII", "8", "8TH"],
  };

  const equivalents = romanMap[target] || [target];
  return equivalents.some(eq => str === eq || str.startsWith(eq));
}

export default async function AdminRoutinePage({ searchParams }: Props) {
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;
  const selectedSemester = typeof resolvedParams.semester === "string" ? resolvedParams.semester : "All";

  const rawRoutine = await db.query.weeklyRoutine.findMany({
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true }
      }
    }
  });

  const allRoutine = rawRoutine.filter(r => matchSemester(r.subject?.semester, selectedSemester));
  const hasRoutine = allRoutine.length > 0;

  const grouped = DAYS.map((dayName, index) => {
    return {
      dayName,
      routines: allRoutine.filter(r => r.dayOfWeek === index),
    };
  });

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
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Class Routine Management
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Manage weekly timetable schedules, room allocations, and teacher assignments across all semesters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canManageRoutine && (
            <Link href="/routine/new" className={buttonVariants({ variant: "default", size: "sm" })}>
              <Plus className="w-4 h-4 mr-2" /> Add Class Slot
            </Link>
          )}
        </div>
      </div>

      {/* Semester Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/20">
        {SEMESTERS.map((sem) => {
          const isActive = selectedSemester === sem;
          const href = sem === "All" ? "/admin/routine" : `/admin/routine?semester=${sem}`;
          return (
            <Link
              key={sem}
              href={href}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {sem === "All" ? "All Semesters" : `Semester ${sem}`}
            </Link>
          );
        })}
      </div>

      {/* Main Timetable View */}
      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5 p-8">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <CalendarRange className="w-8 h-8 text-muted-foreground opacity-60" />
          </div>
          <h3 className="text-xl font-bold font-fira-sans tracking-tight">No Routine Slots Found</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {selectedSemester === "All"
              ? "No weekly class slots have been added yet."
              : `No class slots configured for Semester ${selectedSemester}.`}
          </p>
          {permissions.canManageRoutine && (
            <Link href="/routine/new" className={buttonVariants({ variant: "default", size: "sm" })}>
              <Plus className="w-4 h-4 mr-2" /> Create First Class Slot
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {grouped.map((group) => {
            if (group.routines.length === 0) return null;
            const isToday = DAYS[todayIndex] === group.dayName;
            const slots: TimelineRiverSlot[] = group.routines.map((routine) => {
              let status: TimelineRiverSlot["status"] = "upcoming";
              if (isToday) {
                if (nptTime > routine.endTime) status = "completed";
                else if (nptTime >= routine.startTime && nptTime <= routine.endTime) status = "ongoing";
                else status = "upcoming";
              } else {
                const dayIdx = DAYS.indexOf(group.dayName);
                if (dayIdx < todayIndex) status = "completed";
              }
              return {
                id: routine.id,
                subject: routine.subject.name,
                code: routine.subject.code,
                startTime: routine.startTime,
                endTime: routine.endTime,
                room: routine.room,
                teacherName: routine.subject.teacher?.name,
                status,
                notes: routine.subject.semester ? `Sem ${routine.subject.semester}` : null,
              };
            });

            return (
              <section
                key={group.dayName}
                className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border/50 bg-muted/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-fira-sans">
                    {group.dayName}
                  </h3>
                  {isToday && (
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Today
                    </span>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <TimelineRiver
                    slots={slots}
                    renderActions={
                      permissions.canManageRoutine
                        ? (slot: TimelineRiverSlot) => (
                            <>
                              <Link
                                className={buttonVariants({ variant: "ghost", size: "icon", className: "h-7 w-7 cursor-pointer rounded-md" })}
                                href={`/routine/${slot.id}/edit`}
                                title={`Edit ${slot.subject}`}
                                aria-label={`Edit ${slot.subject}`}
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Link>
                              <DeleteRoutineButton id={slot.id} />
                            </>
                          )
                        : undefined
                    }
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
