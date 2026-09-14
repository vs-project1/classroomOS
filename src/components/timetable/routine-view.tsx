"use client";

import { useMemo, useState } from "react";
import { Calendar, CalendarDays, LayoutGrid, ListFilter, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DayTimeline } from "./day-timeline";
import { WeeklyGrid, type DayGroup } from "./weekly-grid";
import { CollegeTimetableGrid } from "./college-timetable-grid";
import type { RoutineSlotData } from "./routine-card";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type RoutineViewProps = {
  allRoutines: {
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
      semester?: string | null;
      teacher?: { name: string } | null;
    };
  }[];
  todayIndex: number;
  nptTime: string;
  canManageRoutine?: boolean;
  renderActions?: (slot: RoutineSlotData) => React.ReactNode;
  defaultViewMode?: "matrix" | "day" | "grid";
  viewRole?: "TEACHER" | "STUDENT" | "ADMIN" | "CR";
};

export function RoutineView({
  allRoutines,
  todayIndex,
  nptTime,
  canManageRoutine = false,
  renderActions,
  defaultViewMode = "matrix",
  viewRole,
}: RoutineViewProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(todayIndex);
  const [viewMode, setViewMode] = useState<"matrix" | "day" | "grid">(defaultViewMode);

  // Extract 24-hour HH:mm string from nptTime prop or fallback
  const currentTime24 = useMemo(() => {
    if (/^\d{2}:\d{2}$/.test(nptTime)) return nptTime;
    const match = nptTime.match(/(\d{2}:\d{2})/);
    if (match) return match[1];
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  }, [nptTime]);

  // Transform raw routines into DayGroups & compute statuses
  const dayGroups: DayGroup[] = useMemo(() => {
    return DAYS.map((dayName, dayIdx) => {
      const isToday = dayIdx === todayIndex;
      const dayRoutines = allRoutines.filter((r) => r.dayOfWeek === dayIdx);

      const slots: RoutineSlotData[] = dayRoutines.map((r) => {
        let status: RoutineSlotData["status"] = "upcoming";
        if (isToday) {
          if (currentTime24 > r.endTime) status = "completed";
          else if (currentTime24 >= r.startTime && currentTime24 <= r.endTime) status = "ongoing";
          else status = "upcoming";
        } else if (dayIdx < todayIndex) {
          status = "completed";
        }

        return {
          id: r.id,
          subjectName: r.subject.name,
          subjectCode: r.subject.code,
          startTime: r.startTime,
          endTime: r.endTime,
          room: r.room,
          teacherName: r.subject.teacher?.name || r.teacherName,
          notes: r.notes,
          status,
          semester: r.subject.semester,
        };
      });

      return {
        dayName,
        dayIndex: dayIdx,
        isToday,
        slots,
      };
    });
  }, [allRoutines, todayIndex, currentTime24]);

  const allSlots = useMemo(() => {
    return dayGroups.flatMap((g) => g.slots);
  }, [dayGroups]);

  const selectedGroup = dayGroups[selectedDayIndex] || dayGroups[todayIndex];

  return (
    <div className="space-y-6">
      {/* Controls & Day Switcher Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border border-border/60 shadow-2xs">
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {SHORT_DAYS.map((shortName, idx) => {
            const isSelected = selectedDayIndex === idx && viewMode === "day";
            const isToday = idx === todayIndex;
            const classCount = dayGroups[idx].slots.length;

            return (
              <button
                key={shortName}
                onClick={() => {
                  setSelectedDayIndex(idx);
                  setViewMode("day");
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 border cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : isToday
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                    : "bg-background text-foreground border-border/60 hover:bg-muted"
                )}
                title={`View ${DAYS[idx]} Schedule`}
              >
                <span>{shortName}</span>
                {isToday && !isSelected && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                    Today
                  </span>
                )}
                {classCount > 0 && (
                  <span
                    className={cn(
                      "text-[9px] font-bold px-1 rounded-full mt-0.5 tabular-nums",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {classCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher & Add Slot */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          <div className="flex items-center p-1 rounded-lg bg-muted/40 border border-border/60">
            <button
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                viewMode === "matrix"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Traditional College Timetable Noticeboard"
            >
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <span>Timetable</span>
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                viewMode === "day"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Single Day Focus View"
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Day Focus</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Weekly Card Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>

          {canManageRoutine && (
            <Link
              href="/routine/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Slot</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      {viewMode === "matrix" && (
        <CollegeTimetableGrid
          dayGroups={dayGroups}
          allSlots={allSlots}
          canManageRoutine={canManageRoutine}
          renderActions={renderActions}
          viewRole={viewRole}
        />
      )}

      {viewMode === "day" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{selectedGroup.dayName} Schedule</span>
              {selectedGroup.isToday && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Today
                </span>
              )}
            </h3>
            <span className="text-xs text-muted-foreground">
              {selectedGroup.slots.length} class{selectedGroup.slots.length === 1 ? "" : "es"}
            </span>
          </div>

          <DayTimeline
            dayName={selectedGroup.dayName}
            slots={selectedGroup.slots}
            isToday={selectedGroup.isToday}
            canManageRoutine={canManageRoutine}
            renderActions={renderActions}
            viewRole={viewRole}
          />
        </div>
      )}

      {viewMode === "grid" && (
        <WeeklyGrid
          dayGroups={dayGroups}
          canManageRoutine={canManageRoutine}
          renderActions={renderActions}
          viewRole={viewRole}
        />
      )}
    </div>
  );
}
