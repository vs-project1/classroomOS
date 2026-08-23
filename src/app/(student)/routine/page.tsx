import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Edit, CalendarDays } from "lucide-react";
import { DeleteRoutineButton } from "./delete-button";
import { getPermissions } from "@/lib/auth";
import { TimelineRiver, type TimelineRiverSlot } from "@/components/timetable/timeline-river";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function RoutinePage() {
  const [permissions, allRoutine] = await Promise.all([
    getPermissions(),
    db.query.weeklyRoutine.findMany({
      orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true }
        }
      }
    })
  ]);

  const hasRoutine = allRoutine.length > 0;

  const grouped = DAYS.map((dayName, index) => {
    return {
      dayName,
      routines: allRoutine.filter(r => r.dayOfWeek === index),
    };
  });

  // Current NPT time for river status (pulse + desaturate)
  const nptTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const nptParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const nptY = parseInt(nptParts.find((p) => p.type === "year")?.value ?? "1970", 10);
  const nptM = parseInt(nptParts.find((p) => p.type === "month")?.value ?? "1", 10) - 1;
  const nptD = parseInt(nptParts.find((p) => p.type === "day")?.value ?? "1", 10);
  const todayIndex = new Date(nptY, nptM, nptD).getDay();

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Weekly Routine</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            View your scheduled theory lectures, laboratory practicals, and module timings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canManageRoutine && (
            <Link className={`text-xs font-semibold px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer`} href="/routine/new">
              <Plus className="h-3.5 w-3.5" /> Add Slot
            </Link>
          )}
        </div>
      </div>

      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <CalendarDays className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold font-fira-sans tracking-tight">No Classes Scheduled</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            There are no classes scheduled in the weekly routine. New time slots added by faculty or CRs will appear here automatically.
          </p>
          {permissions.canManageRoutine && (
            <div className="pt-2">
              <Link href="/routine/new" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-4 h-4" /> Add First Slot
              </Link>
            </div>
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
                // Past days desaturate when compared to today index
                const dayIdx = DAYS.indexOf(group.dayName);
                // If weekly view and day is before today in week order, mark completed (visual hint)
                if (dayIdx < todayIndex) status = "completed";
              }
              return {
                id: routine.id,
                subject: routine.subject.name,
                code: routine.subject.code,
                startTime: routine.startTime,
                endTime: routine.endTime,
                room: routine.room,
                teacherName: routine.subject.teacher?.name || routine.teacherName,
                notes: routine.notes,
                status,
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
