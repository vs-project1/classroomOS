import React from "react";
import { RoutineCard, type RoutineSlotData } from "./routine-card";
import { cn } from "@/lib/utils";

export type DayGroup = {
  dayName: string;
  dayIndex: number;
  isToday?: boolean;
  slots: RoutineSlotData[];
};

export type WeeklyGridProps = {
  dayGroups: DayGroup[];
  canManageRoutine?: boolean;
  renderActions?: (slot: RoutineSlotData) => React.ReactNode;
};

export function WeeklyGrid({ dayGroups, canManageRoutine, renderActions }: WeeklyGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
      {dayGroups.map((group) => {
        const sortedSlots = [...group.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <div
            key={group.dayName}
            className={cn(
              "flex flex-col rounded-xl border bg-card shadow-2xs overflow-hidden transition-colors",
              group.isToday ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60"
            )}
          >
            {/* Column Header */}
            <div
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 border-b text-xs font-bold uppercase tracking-wider",
                group.isToday
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted/30 text-muted-foreground border-border/40"
              )}
            >
              <span>{group.dayName}</span>
              {group.isToday && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Today
                </span>
              )}
            </div>

            {/* Column Classes Stack */}
            <div className="p-3 space-y-3 flex-1">
              {sortedSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground/60 italic">
                  No classes
                </div>
              ) : (
                sortedSlots.map((slot) => (
                  <RoutineCard
                    key={slot.id}
                    slot={slot}
                    canManageRoutine={canManageRoutine}
                    renderActions={renderActions}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
