"use client";

import React, { useMemo } from "react";
import { Coffee, Edit, Laptop, Radio } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { formatTime12h } from "@/lib/timezone";
import { DeleteRoutineButton } from "@/features/routine/components/delete-routine-button";
import type { RoutineSlotData } from "./routine-card";
import type { DayGroup } from "./weekly-grid";
import { computePeriodColumns, buildDayMatrixRows, type PeriodColumn, type DayRowMatrix } from "./matrix-utils";

export type CollegeTimetableGridProps = {
  dayGroups: DayGroup[];
  allSlots: RoutineSlotData[];
  canManageRoutine?: boolean;
  renderActions?: (slot: RoutineSlotData) => React.ReactNode;
  className?: string;
  viewRole?: "TEACHER" | "STUDENT" | "ADMIN" | "CR";
};

export function CollegeTimetableGrid({
  dayGroups,
  allSlots,
  canManageRoutine = false,
  renderActions,
  className,
  viewRole,
}: CollegeTimetableGridProps) {
  // 1. Compute dynamic period columns across all slots
  const periodColumns = useMemo<PeriodColumn[]>(() => {
    return computePeriodColumns(allSlots);
  }, [allSlots]);

  // 2. Build rows for each day with merged adjacent double periods
  const matrixRows = useMemo<DayRowMatrix[]>(() => {
    return buildDayMatrixRows(dayGroups, periodColumns);
  }, [dayGroups, periodColumns]);

  if (periodColumns.length === 0 || allSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/60 bg-card/50 space-y-3">
        <p className="text-sm font-semibold text-foreground">No timetable slots available to display.</p>
        <p className="text-xs text-muted-foreground">Add class slots to build the weekly noticeboard routine.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Scrollable Noticeboard Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-xs scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
              {/* Sticky Day Header */}
              <th className="sticky left-0 z-20 bg-muted/95 backdrop-blur-xs p-3 font-bold w-28 text-foreground border-r border-border/70 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                Day / Time
              </th>

              {/* Period Columns */}
              {periodColumns.map((col) => {
                if (col.isBreak) {
                  return (
                    <th
                      key={col.id}
                      className="p-2 font-black text-center w-[72px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-r border-border/70 select-none"
                      title={`Break / Recess (${col.durationMins} minutes)`}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <Coffee className="w-3.5 h-3.5 opacity-80" />
                        <span className="text-[10px] font-black uppercase tracking-widest">BREAK</span>
                        <span className="text-[9px] font-medium opacity-80">{col.durationMins}m</span>
                      </div>
                    </th>
                  );
                }

                return (
                  <th
                    key={col.id}
                    className="p-3 font-semibold border-r border-border/70 text-center min-w-[170px] max-w-[220px]"
                  >
                    <div className="font-bold text-foreground text-xs">{col.label}</div>
                    <div className="text-[10px] text-muted-foreground font-medium tabular-nums mt-0.5">
                      {formatTime12h(col.startTime)} – {formatTime12h(col.endTime)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body (Days) */}
          <tbody className="divide-y divide-border/60">
            {matrixRows.map((row) => {
              const hasClasses = row.cells.some((c) => c.type === "class");

              return (
                <tr
                  key={row.dayName}
                  className={cn(
                    "transition-colors group",
                    row.isToday
                      ? "bg-primary/[0.04] hover:bg-primary/[0.07]"
                      : "hover:bg-muted/20"
                  )}
                >
                  {/* Sticky Day Column */}
                  <td
                    className={cn(
                      "sticky left-0 z-10 p-3 font-bold border-r border-border/70 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]",
                      row.isToday
                        ? "bg-primary/10 text-primary border-r-primary/30"
                        : "bg-card text-foreground group-hover:bg-muted/40"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold font-fira-sans">{row.dayName}</span>
                      {row.isToday && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Today
                        </span>
                      )}
                      {!hasClasses && !row.isToday && (
                        <span className="text-[10px] font-normal text-muted-foreground/60 italic">
                          Off
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Period Cells */}
                  {row.cells.map((cell, cIdx) => {
                    // Break column cell
                    if (cell.type === "break") {
                      return (
                        <td
                          key={`break_${cIdx}`}
                          className="bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-r border-border/70 text-center select-none p-1"
                        >
                          <div className="flex flex-col items-center justify-center h-full min-h-[64px] text-amber-600/40 dark:text-amber-400/40 text-[10px]">
                            <Coffee className="w-3.5 h-3.5 mb-0.5 opacity-60" />
                          </div>
                        </td>
                      );
                    }

                    // Empty slot cell
                    if (cell.type === "empty") {
                      return (
                        <td
                          key={`empty_${cIdx}`}
                          className="p-2 border-r border-border/70 text-center text-muted-foreground/30 select-none"
                        >
                          <div className="min-h-[64px] flex items-center justify-center">
                            <span className="text-xs">—</span>
                          </div>
                        </td>
                      );
                    }

                    // Class cell with colSpan support
                    const classData = cell.cellData!;
                    const isOngoing = classData.status === "ongoing";
                    const isLab = classData.isLab;
                    const isDouble = classData.isDoublePeriod;

                    return (
                      <td
                        key={classData.id}
                        colSpan={cell.colSpan}
                        className="p-1.5 border-r border-border/70 align-top"
                      >
                        <div
                          data-testid="timetable-matrix-card"
                          className={cn(
                            "relative flex flex-col justify-between h-full min-h-[68px] p-2.5 rounded-lg border transition-all duration-150 space-y-1.5",
                            isOngoing
                              ? "border-primary/50 bg-primary/10 shadow-xs ring-1 ring-primary/30"
                              : isLab
                              ? "border-indigo-500/30 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.12] border-l-3 border-l-indigo-500"
                              : isDouble
                              ? "border-blue-500/30 bg-blue-500/[0.05] dark:bg-blue-500/[0.1] border-l-3 border-l-blue-500"
                              : "border-border/60 bg-background/80 hover:bg-background hover:border-border hover:shadow-2xs"
                          )}
                        >
                          {/* Top Row: Title + Badges + Actions */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-foreground text-xs leading-snug line-clamp-1">
                                  {classData.subjectName}
                                </h4>

                                {classData.subjectCode && (
                                  <span className="shrink-0 text-[9px] font-bold px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/50 tabular-nums">
                                    {classData.subjectCode}
                                  </span>
                                )}

                                {classData.semester && (
                                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/25">
                                    Sem {classData.semester}
                                  </span>
                                )}

                                {isDouble && (
                                  <span className="shrink-0 text-[9px] font-bold px-1 py-0.2 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                                    {cell.colSpan} Periods
                                  </span>
                                )}

                                {isLab && (
                                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                    <Laptop className="h-2.5 w-2.5" /> Lab
                                  </span>
                                )}

                                {isOngoing && (
                                  <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider animate-pulse">
                                    <Radio className="h-2.5 w-2.5" /> NOW
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Render Admin Actions */}
                            {renderActions ? (
                              <div className="flex items-center gap-0.5 shrink-0 opacity-80 hover:opacity-100">
                                {renderActions(classData.originalSlots[0])}
                              </div>
                            ) : canManageRoutine ? (
                              <div className="flex items-center gap-0.5 shrink-0 opacity-80 hover:opacity-100">
                                <Link
                                  className={buttonVariants({
                                    variant: "ghost",
                                    size: "icon",
                                    className: "h-6 w-6 rounded-md cursor-pointer hover:bg-muted p-0",
                                  })}
                                  href={`/routine/${classData.id}/edit`}
                                  title={`Edit ${classData.subjectName}`}
                                  aria-label={`Edit ${classData.subjectName}`}
                                >
                                  <Edit className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </Link>
                                <DeleteRoutineButton id={classData.id} />
                              </div>
                            ) : null}
                          </div>

                          {/* Bottom Row: Metadata (Room + Teacher/Notes) */}
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap pt-0.5 border-t border-border/40">
                            {classData.room && (
                              <span className="font-semibold text-foreground/90 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                                {classData.room.startsWith("Room") || classData.room.startsWith("Lab")
                                  ? classData.room
                                  : `Room ${classData.room}`}
                              </span>
                            )}
                            {viewRole !== "TEACHER" && classData.teacherName && (
                              <>
                                {classData.room && <span className="opacity-40">•</span>}
                                <span className="truncate max-w-[140px] text-foreground/80">
                                  {classData.teacherName}
                                </span>
                              </>
                            )}
                            {viewRole === "TEACHER" && classData.notes && (
                              <>
                                {classData.room && <span className="opacity-40">•</span>}
                                <span className="italic truncate max-w-[140px]">
                                  {classData.notes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Instructions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-blue-500/40 bg-blue-500/20" />
            Double Period (Merged)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-indigo-500/40 bg-indigo-500/20" />
            Lab Practical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-amber-500/40 bg-amber-500/20" />
            Recess / Break
          </span>
        </div>
        <span className="italic text-[10px] opacity-75">
          Tip: Horizontal scroll or swipe to view full day schedule
        </span>
      </div>
    </div>
  );
}
