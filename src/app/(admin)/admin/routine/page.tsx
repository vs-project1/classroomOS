import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Plus, CalendarRange, AlertTriangle, Edit } from "lucide-react";
import { getPermissions } from "@/lib/auth";
import { RoutineView } from "@/components/timetable/routine-view";
import { DeleteRoutineButton } from "@/features/routine/components/delete-routine-button";
import { buttonVariants } from "@/components/ui/button";
import { BroadcastRoutineDialog } from "@/features/telegram/components/broadcast-routine-dialog";
import { getTelegramSettings, getSemesterTelegramConfigs } from "@/features/telegram/queries/telegram-queries";
import { areSemestersEqual } from "@/lib/utils/roman";
import type { RoutineSlotData } from "@/components/timetable/routine-card";

export const dynamic = "force-dynamic";

const SEMESTERS = ["All", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function matchSemester(subSem: string | number | null | undefined, targetSem: string | null): boolean {
  if (!targetSem || targetSem === "All") return true;
  return areSemestersEqual(subSem, targetSem);
}

export default async function AdminRoutinePage({ searchParams }: Props) {
  const permissions = await getPermissions();
  const resolvedParams = await searchParams;

  const rawRoutine = await db.query.weeklyRoutine.findMany({
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
    },
  });

  // Determine active semesters that have slots configured
  const semestersWithSlots = Array.from(
    new Set(rawRoutine.map((r) => r.subject?.semester).filter(Boolean))
  ) as string[];

  // If no semester is explicitly in URL, default to active cohort (Semester II if available, else first active, else I)
  const defaultSemester = semestersWithSlots.includes("II")
    ? "II"
    : semestersWithSlots.length > 0
    ? semestersWithSlots[0]
    : "I";

  const selectedSemester =
    typeof resolvedParams.semester === "string"
      ? resolvedParams.semester
      : defaultSemester;

  const allRoutine = rawRoutine.filter((r) => matchSemester(r.subject?.semester, selectedSemester));
  const hasRoutine = allRoutine.length > 0;

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

  const [telegramSettingsRow, telegramConfigs] = await Promise.all([
    getTelegramSettings(),
    getSemesterTelegramConfigs(),
  ]);
  const hasBotToken = Boolean(telegramSettingsRow?.botToken);
  const configuredSemesters = telegramConfigs.filter((c) => Boolean(c.chatId)).map((c) => c.semester);

  // Semesters with unpublished modifications
  const unpublishedSemesters = telegramConfigs
    .filter((c) => {
      if (!c.lastRoutineModifiedAt) return false;
      if (!c.lastRoutinePublishedAt) return true;
      return new Date(c.lastRoutineModifiedAt).getTime() > new Date(c.lastRoutinePublishedAt).getTime();
    })
    .map((c) => c.semester);

  const hasUnpublishedChanges =
    selectedSemester === "All"
      ? unpublishedSemesters.length > 0
      : unpublishedSemesters.some((s) => areSemestersEqual(s, selectedSemester));

  return (
    <div className="flex-1 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/60">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Class Routine Management
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl">
            Manage weekly timetable schedules, room allocations, and teacher assignments across all semester cohorts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {permissions.canManageRoutine && (
            <>
              <BroadcastRoutineDialog
                currentSemester={selectedSemester}
                configuredSemesters={configuredSemesters}
                hasBotToken={hasBotToken}
                hasUnpublishedChanges={hasUnpublishedChanges}
                unpublishedSemesters={unpublishedSemesters}
              />
              <Link href="/routine/new" className={buttonVariants({ variant: "default", size: "sm" })}>
                <Plus className="w-4 h-4 mr-2" /> Add Class Slot
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Unpublished Changes Alert Banner */}
      {hasUnpublishedChanges && permissions.canManageRoutine && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-fira-sans">
                Unpublished Routine Changes {selectedSemester !== "All" ? `— Semester ${selectedSemester}` : `(${unpublishedSemesters.map((s) => `Sem ${s}`).join(", ")})`}
              </h4>
              <p className="text-xs opacity-90 mt-0.5">
                Timetable modifications have been saved. Click &ldquo;Publish Changes&rdquo; to broadcast the updated schedule notice to the Telegram group.
              </p>
            </div>
          </div>
          <BroadcastRoutineDialog
            currentSemester={selectedSemester}
            configuredSemesters={configuredSemesters}
            hasBotToken={hasBotToken}
            hasUnpublishedChanges={true}
            unpublishedSemesters={unpublishedSemesters}
            triggerVariant="banner"
          />
        </div>
      )}

      {/* Semester Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/40">
        {SEMESTERS.map((sem) => {
          const isActive = selectedSemester === sem;
          const isUnpub = sem === "All" ? unpublishedSemesters.length > 0 : unpublishedSemesters.includes(sem);
          const hasData = sem === "All" ? rawRoutine.length > 0 : semestersWithSlots.some((s) => areSemestersEqual(s, sem));
          const href = `/admin/routine?semester=${sem}`;

          return (
            <Link
              key={sem}
              href={href}
              className={`relative px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <span>{sem === "All" ? "All Semesters" : `Semester ${sem}`}</span>
              {hasData && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" title="Classes scheduled" />
              )}
              {isUnpub && (
                <span
                  className={`h-2 w-2 rounded-full ${isActive ? "bg-amber-300" : "bg-amber-500 animate-pulse"}`}
                  title="Unpublished changes pending"
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Main Timetable View */}
      {!hasRoutine ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-4 max-w-md mx-auto text-center border rounded-2xl border-dashed bg-card/50 p-8">
          <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center mb-2">
            <CalendarRange className="w-8 h-8 text-muted-foreground opacity-70" />
          </div>
          <h3 className="text-xl font-bold font-fira-sans tracking-tight text-foreground">No Routine Slots Found</h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {selectedSemester === "All"
              ? "No weekly class slots have been added to the timetable yet."
              : `No class slots configured for Semester ${selectedSemester}. Click 'Add Class Slot' to schedule subjects.`}
          </p>
          {permissions.canManageRoutine && (
            <Link href="/routine/new" className={buttonVariants({ variant: "default", size: "sm" })}>
              <Plus className="w-4 h-4 mr-2" /> Add First Class Slot
            </Link>
          )}
        </div>
      ) : (
        <RoutineView
          allRoutines={allRoutine as any}
          todayIndex={todayIndex < 0 ? 0 : todayIndex}
          nptTime={nptTime}
          canManageRoutine={permissions.canManageRoutine}
          defaultViewMode="matrix"
          renderActions={
            permissions.canManageRoutine
              ? (slot: RoutineSlotData) => (
                  <div className="flex items-center gap-1">
                    <Link
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon",
                        className: "h-6 w-6 rounded-md cursor-pointer hover:bg-muted",
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
