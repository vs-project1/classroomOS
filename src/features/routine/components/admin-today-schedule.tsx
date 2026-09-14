"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, CalendarDays } from "lucide-react";
import { formatTime12h } from "@/lib/timezone";
import { areSemestersEqual } from "@/lib/utils/roman";

export const SEMESTERS = ["All", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;
export type SemesterType = (typeof SEMESTERS)[number];

export interface RoutineClassItem {
  id: string;
  startTime: string;
  endTime: string;
  room: string | null;
  subject: {
    id: string;
    name: string;
    code: string;
    semester: string | null;
    teacher?: {
      name: string;
    } | null;
  };
}

export interface AdminTodayScheduleProps {
  classes: RoutineClassItem[];
  currentTime: string;
  initialSemester?: string;
}

export function matchSemester(
  subSem: string | number | null | undefined,
  targetSem: string | null
): boolean {
  if (!targetSem || targetSem === "All") return true;
  return areSemestersEqual(subSem, targetSem);
}

export function AdminTodaySchedule({
  classes,
  currentTime,
  initialSemester,
}: AdminTodayScheduleProps) {
  const [selectedSemester, setSelectedSemester] = useState<string>(() => {
    if (initialSemester && SEMESTERS.includes(initialSemester as SemesterType)) {
      return initialSemester;
    }
    return "All";
  });

  // Calculate class counts per semester
  const semesterCounts = useMemo(() => {
    const counts: Record<string, number> = { All: classes.length };
    for (const sem of SEMESTERS) {
      if (sem === "All") continue;
      counts[sem] = classes.filter((c) => matchSemester(c.subject?.semester, sem)).length;
    }
    return counts;
  }, [classes]);

  const handleSelectSemester = (sem: string) => {
    setSelectedSemester(sem);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (sem === "All") {
        url.searchParams.delete("semester");
      } else {
        url.searchParams.set("semester", sem);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Filter and sort classes for active tab
  const filteredClasses = useMemo(() => {
    const list = classes.filter((c) => matchSemester(c.subject?.semester, selectedSemester));
    return [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [classes, selectedSemester]);

  const nextClass = filteredClasses.find((c) => currentTime < c.startTime);

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 flex flex-col h-full min-h-[360px]">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg text-foreground tracking-tight">Today&apos;s Schedule</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground ml-1">
            {filteredClasses.length} {filteredClasses.length === 1 ? "class" : "classes"}
          </span>
        </div>

        {/* Quick Link to Routine */}
        <Link
          href={selectedSemester === "All" ? "/admin/routine" : `/admin/routine?semester=${selectedSemester}`}
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Routine view <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2. Horizontal Semester Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-thin scrollbar-thumb-border/40">
        {SEMESTERS.map((sem) => {
          const isSelected = selectedSemester === sem;
          const count = semesterCounts[sem] || 0;
          const hasClasses = count > 0;

          return (
            <button
              key={sem}
              type="button"
              onClick={() => handleSelectSemester(sem)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : hasClasses
                  ? "bg-muted/40 hover:bg-muted text-foreground border-border/60"
                  : "bg-background/40 hover:bg-muted/40 text-muted-foreground border-border/30 opacity-70"
              }`}
            >
              <span>{sem === "All" ? "All Semesters" : `Sem ${sem}`}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : hasClasses
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Class List or Empty State */}
      {filteredClasses.length > 0 ? (
        <div className="space-y-2.5 mb-6 flex-1">
          {filteredClasses.map((c) => {
            const isOngoing = c.startTime <= currentTime && c.endTime >= currentTime;
            const isCompleted = currentTime > c.endTime;
            const isNext = c.id === nextClass?.id;

            return (
              <div
                key={c.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors border ${
                  isOngoing
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isNext
                    ? "bg-primary/5 border-primary/30"
                    : isCompleted
                    ? "bg-muted/20 border-transparent opacity-60"
                    : "hover:bg-muted/40 border-transparent"
                }`}
              >
                <div>
                  <div className="font-semibold text-foreground flex items-center flex-wrap gap-2">
                    <span>{c.subject.name}</span>

                    {/* Semester Pill */}
                    {c.subject.semester && (
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                        Sem {c.subject.semester}
                      </span>
                    )}

                    {/* Status Indicators */}
                    {isOngoing && (
                      <span className="text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ongoing
                      </span>
                    )}
                    {isNext && (
                      <span className="text-xs font-bold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                        Next Up
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-xs font-semibold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full border border-border">
                        Completed
                      </span>
                    )}
                    {!isOngoing && !isNext && !isCompleted && (
                      <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground mt-1">
                    {c.subject.teacher?.name || "TBA"}{" "}
                    {c.room
                      ? `• ${c.room.startsWith("Room") || c.room.startsWith("Lab") ? c.room : `Room ${c.room}`}`
                      : ""}
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <div className="text-sm font-medium tabular-nums text-foreground">
                    {formatTime12h(c.startTime)} - {formatTime12h(c.endTime)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-muted-foreground text-sm mb-6 bg-muted/20 p-8 text-center rounded-lg border border-dashed border-border/40 flex-1 flex flex-col items-center justify-center gap-2">
          <CalendarDays className="h-7 w-7 text-muted-foreground/40 mb-1" />
          <p className="font-medium text-foreground">
            {selectedSemester === "All"
              ? "No classes scheduled for today."
              : `No classes scheduled for Semester ${selectedSemester} today.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Select another semester tab above or view the weekly schedule.
          </p>
        </div>
      )}

      {/* 4. Footer Full Routine Link */}
      <Link
        href={selectedSemester === "All" ? "/admin/routine" : `/admin/routine?semester=${selectedSemester}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-auto hover:underline w-fit cursor-pointer"
      >
        View Full Routine <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
