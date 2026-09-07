import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Edit, CalendarDays, Plus, AlertTriangle } from "lucide-react";
import { DeleteRoutineButton } from "@/features/routine/components/delete-routine-button";
import { getCurrentUser, getPermissions, resolveCurrentStudent } from "@/lib/auth";
import { toRoman } from "@/lib/utils/roman";
import { RoutineView } from "@/components/timetable/routine-view";
import type { RoutineSlotData } from "@/components/timetable/routine-card";
import { BroadcastRoutineDialog } from "@/features/telegram/components/broadcast-routine-dialog";
import { getTelegramSettings, getSemesterTelegramConfigs } from "@/features/telegram/queries/telegram-queries";
import {
  getStudentCohort,
  getStudentWeeklyRoutine,
  getTeacherWeeklyRoutine,
} from "@/features/routine/queries";

export const dynamic = "force-dynamic";

export default async function RoutinePage() {
  const [user, permissions, telegramSettingsRow, telegramConfigs] = await Promise.all([
    getCurrentUser(),
    getPermissions(),
    getTelegramSettings(),
    getSemesterTelegramConfigs(),
  ]);

  let filteredRoutine: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string | null;
    notes?: string | null;
    teacherName?: string | null;
    subject: {
      name: string;
      code: string;
      teacher?: { name: string } | null;
    };
  }[] = [];

  let studentRomanSem: string | null = null;
  const isStudentOrCr = user?.role === "STUDENT" || user?.role === "CR";

  if (isStudentOrCr) {
    const student = await resolveCurrentStudent();
    const cohort = await getStudentCohort(student?.id, user?.id);
    studentRomanSem = cohort.semester ? toRoman(cohort.semester) : null;
    filteredRoutine = await getStudentWeeklyRoutine(cohort.allowedSubjectIds);
  } else if (user?.role === "TEACHER" && user.teacherId) {
    filteredRoutine = await getTeacherWeeklyRoutine(user.teacherId);
  } else {
    // Admin / Manager view: all routine entries
    filteredRoutine = await db.query.weeklyRoutine.findMany({
      orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    });
  }

  const hasRoutine = filteredRoutine.length > 0;

  // Telegram routine change detection
  const hasBotToken = Boolean(telegramSettingsRow?.botToken);
  const configuredSemesters = telegramConfigs.filter((c) => Boolean(c.chatId)).map((c) => c.semester);

  const unpublishedSemesters = telegramConfigs
    .filter((c) => {
      if (!c.lastRoutineModifiedAt) return false;
      if (!c.lastRoutinePublishedAt) return true;
      return new Date(c.lastRoutineModifiedAt).getTime() > new Date(c.lastRoutinePublishedAt).getTime();
    })
    .map((c) => c.semester);

  const hasUnpublishedChanges = studentRomanSem
    ? unpublishedSemesters.includes(studentRomanSem)
    : unpublishedSemesters.length > 0;

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
            Weekly Routine {studentRomanSem ? `(Semester ${studentRomanSem})` : ""}
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl">
            View scheduled lectures, lab practicals, and room assignments for your cohort.
          </p>
        </div>
        {permissions.canManageRoutine && (
          <div className="flex flex-wrap items-center gap-2">
            <BroadcastRoutineDialog
              currentSemester={studentRomanSem || "All"}
              configuredSemesters={configuredSemesters}
              hasBotToken={hasBotToken}
              hasUnpublishedChanges={hasUnpublishedChanges}
              unpublishedSemesters={unpublishedSemesters}
            />
            <Link href="/routine/new" className={buttonVariants({ variant: "default", size: "sm" })}>
              <Plus className="w-4 h-4 mr-2" /> Add Class Slot
            </Link>
          </div>
        )}
      </div>

      {/* Unpublished Changes Alert Banner for Managers */}
      {hasUnpublishedChanges && permissions.canManageRoutine && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-fira-sans">
                Unpublished Routine Changes {studentRomanSem ? `— Semester ${studentRomanSem}` : `(${unpublishedSemesters.map((s) => `Sem ${s}`).join(", ")})`}
              </h4>
              <p className="text-xs opacity-90 mt-0.5">
                Timetable modifications have been saved. Click &ldquo;Publish Changes&rdquo; to broadcast the updated schedule notice to the Telegram group.
              </p>
            </div>
          </div>
          <BroadcastRoutineDialog
            currentSemester={studentRomanSem || "All"}
            configuredSemesters={configuredSemesters}
            hasBotToken={hasBotToken}
            hasUnpublishedChanges={true}
            unpublishedSemesters={unpublishedSemesters}
            triggerVariant="banner"
          />
        </div>
      )}

      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-2xl border-dashed bg-card/50">
          <div className="h-14 w-14 bg-muted/40 rounded-full flex items-center justify-center mb-1 text-muted-foreground">
            <CalendarDays className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-semibold font-fira-sans tracking-tight">
            {studentRomanSem ? `No Classes for Semester ${studentRomanSem}` : "No Classes Scheduled"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            There are no timetable slots registered for your cohort yet. Once your semester routine is published, it will appear here.
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
