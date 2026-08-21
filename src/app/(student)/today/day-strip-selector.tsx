"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface DayItem {
  dateStr: string;
  dayNum: number;
  weekdayName: string;
  isActive: boolean;
  isToday: boolean;
}

interface DayStripSelectorProps {
  days: DayItem[];
}

export function DayStripSelector({ days }: DayStripSelectorProps) {
  const router = useRouter();

  return (
    <div className="border-b border-border/40">
      <div className="flex justify-between md:justify-start gap-1 pb-2 md:gap-3 overflow-x-auto no-scrollbar">
        {days.map((d) => (
          <button
            key={d.dateStr}
            type="button"
            data-testid="day-strip-btn"
            onClick={() => router.push(`/today?date=${d.dateStr}`)}
            className={cn(
              "py-2 px-3.5 rounded-xl flex flex-col items-center transition-all min-w-[3.5rem] border cursor-pointer select-none",
              d.isActive
                ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/20 border-primary"
                : d.isToday
                ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                : "border-transparent hover:bg-muted/60 text-muted-foreground"
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-wider">{d.weekdayName}</span>
            <span className="text-base font-semibold mt-0.5 tabular-nums">{d.dayNum}</span>
            {d.isToday && !d.isActive && <span className="w-1.5 h-1.5 bg-primary rounded-full mt-0.5" />}
          </button>
        ))}
      </div>
    </div>
  );
}
