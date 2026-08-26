import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { CalendarDays, Edit, Plus } from "lucide-react";
import { requireAuth, getPermissions } from "@/lib/auth";
import { TimelineRiver, type TimelineRiverSlot } from "@/components/timetable/timeline-river";
import { buttonVariants } from "@/components/ui/button";
import { DeleteRoutineButton } from "@/app/(student)/routine/delete-button";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TeacherRoutinePage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  const permissions = await getPermissions();

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">My Routine</h1>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  // Find all subjects this teacher teaches
  const teacherSubjects = await db.query.subjects.findMany({
    where: (subjects, { eq }) => eq(subjects.teacherId, user.teacherId!),
  });

  const subjectIds = teacherSubjects.map(s => s.id);

  let allRoutine: any[] = [];
  if (subjectIds.length > 0) {
    allRoutine = await db.query.weeklyRoutine.findMany({
      where: inArray(weeklyRoutine.subjectId, subjectIds),
      orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true }
        }
      }
    });
  }

  const hasRoutine = allRoutine.length > 0;

  const grouped = DAYS.map((dayName, index) => {
    return {
      dayName,
      routines: allRoutine.filter(r => r.dayOfWeek === index),
    };
  });

  // Current NPT time for river status (pulse + desaturate)
  const nptTime = formatNepaliDateTime(new Date());
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
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">My Weekly Routine</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Your personalized teaching schedule across all assigned semesters.
          </p>
        </div>
      </div>

      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Classes Scheduled</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You don't have any classes scheduled in the system yet.
          </p>
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
                notes: `Semester ${routine.subject.semester}`,
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
