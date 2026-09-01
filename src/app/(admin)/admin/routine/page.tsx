import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Edit, CalendarDays, ArrowLeft, ArrowRight, CalendarRange } from "lucide-react";
import { getPermissions } from "@/lib/auth";
import { TimelineRiver, type TimelineRiverSlot } from "@/components/timetable/timeline-river";
import { DeleteRoutineButton } from "@/app/(student)/routine/delete-button";
import { buttonVariants } from "@/components/ui/button";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminRoutinePage({ searchParams }: Props) {
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;
  const semester = typeof resolvedParams.semester === "string" ? resolvedParams.semester : null;

  if (!semester) {
    return (
      <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Class Routines
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Select a semester to view and manage its weekly class schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SEMESTERS.map((sem) => (
            <Link
              key={sem}
              href={`/admin/routine?semester=${sem}`}
              className="group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative p-6 h-32"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-fira-sans text-foreground">Semester {sem}</h3>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarRange className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-sm text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                View Routine <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const rawRoutine = await db.query.weeklyRoutine.findMany({
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true }
      }
    }
  });

  const allRoutine = rawRoutine.filter(r => r.subject?.semester === semester);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Link href="/admin/routine" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">
              Semester {semester} Routine
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Manage the weekly class schedule for Semester {semester}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canManageRoutine && (
            <Link href="/routine/new" className={buttonVariants({ variant: "default", size: "sm" })}>
              <Plus className="w-4 h-4 mr-2" /> Add Class
            </Link>
          )}
        </div>
      </div>

      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Routine Created</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The weekly class schedule for this semester hasn't been set up yet.
          </p>
          {permissions.canManageRoutine && (
            <Link href="/routine/new" className={buttonVariants({ variant: "default" })}>
              <Plus className="w-4 h-4 mr-2" /> Create First Class
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
                notes: null,
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
