import React from "react";
import { CalendarOff } from "lucide-react";
import { RoutineCard, type RoutineSlotData } from "./routine-card";

export type DayTimelineProps = {
  dayName: string;
  slots: RoutineSlotData[];
  isToday?: boolean;
  canManageRoutine?: boolean;
  renderActions?: (slot: RoutineSlotData) => React.ReactNode;
};

export function DayTimeline({ dayName, slots, isToday, canManageRoutine, renderActions }: DayTimelineProps) {
  const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sortedSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/60 bg-card/50 space-y-3">
        <div className="p-3 rounded-full bg-muted/40 text-muted-foreground">
          <CalendarOff className="h-8 w-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-base text-foreground tracking-tight">No Classes Scheduled</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            There are no classes scheduled for {dayName}. Enjoy your free time!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedSlots.map((slot) => (
        <RoutineCard
          key={slot.id}
          slot={slot}
          canManageRoutine={canManageRoutine}
          renderActions={renderActions}
        />
      ))}
    </div>
  );
}
