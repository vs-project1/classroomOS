import { db } from "@/db";
import { weeklyRoutine, studentProfiles } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Edit, CalendarDays } from "lucide-react";
import { DeleteRoutineButton } from "@/features/routine/components/delete-routine-button";
import { getCurrentUser, getPermissions } from "@/lib/auth";
import { toRoman } from "@/lib/utils/roman";
import { getNptTimeString } from "@/lib/timezone";
import { RoutineView } from "@/components/timetable/routine-view";
import type { RoutineSlotData } from "@/components/timetable/routine-card";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const [user, permissions, allRoutine] = await Promise.all([
    getCurrentUser(),
    getPermissions(),
    db.query.weeklyRoutine.findMany({
      orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    }),
  ]);

  let studentProfile = null;
  if (user?.studentProfileId) {
    studentProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });
  }

  let filteredRoutine = allRoutine;
  if (studentProfile?.semester != null) {
    const romanSem = toRoman(studentProfile.semester);
    const semesterRoutines = allRoutine.filter((r) => r.subject?.semester === romanSem);
    if (semesterRoutines.length > 0) {
      filteredRoutine = semesterRoutines;
    }
  }

  const hasRoutine = filteredRoutine.length > 0;

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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-bold font-fira-sans tracking-tight text-foreground">
            Weekly Routine
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl">
            View scheduled lectures, lab practicals, and room assignments.
          </p>
        </div>
      </div>

      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-card/50">
          <div className="h-14 w-14 bg-muted/40 rounded-full flex items-center justify-center mb-1 text-muted-foreground">
            <CalendarDays className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-semibold font-fira-sans tracking-tight">No Classes Scheduled</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            There are no classes scheduled in the weekly routine yet.
          </p>
        </div>
      ) : (
        <RoutineView
          allRoutines={filteredRoutine}
          todayIndex={todayIndex < 0 ? 0 : todayIndex}
          nptTime={nptTime}
          canManageRoutine={permissions.canManageRoutine}
          renderActions={
            permissions.canManageRoutine
              ? (slot: RoutineSlotData) => (
                  <div className="flex items-center gap-1">
                    <Link
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon",
                        className: "h-7 w-7 rounded-md cursor-pointer",
                      })}
                      href={`/routine/${slot.id}/edit`}
                      title={`Edit ${slot.subjectName}`}
                      aria-label={`Edit ${slot.subjectName}`}
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </Link>
                    <DeleteRoutineButton id={slot.id} />
                  </div>
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
