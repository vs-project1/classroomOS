import { Clock, MapPin, User, Radio, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime12h } from "@/lib/timezone";

export type TimelineRiverSlot = {
  id: string;
  subject: string;
  code?: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherName?: string | null;
  status?: "upcoming" | "ongoing" | "completed";
  notes?: string | null;
};

export type TimelineRiverProps = {
  slots: TimelineRiverSlot[];
  className?: string;
  /** 7 = 7AM start, 16 = 4PM end (inclusive) */
  startHour?: number;
  endHour?: number;
  /** Optional action node per slot (e.g., edit/delete). Rendered top-right of pill. */
  renderActions?: (slot: TimelineRiverSlot) => React.ReactNode;
};

const DEFAULT_START = 7;
const DEFAULT_END = 16;

function parseHour(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h + m / 60;
}

function hourLabel(h: number): string {
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function TimelineRiver({
  slots,
  className,
  renderActions,
}: TimelineRiverProps) {
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sorted.length === 0) {
    return (
      <div
        data-testid="timeline-river"
        className={cn(
          "relative rounded-xl border border-dashed bg-muted/5 py-12 text-center text-sm text-muted-foreground",
          className
        )}
      >
        No classes in this range.
      </div>
    );
  }

  const lastSlot = sorted[sorted.length - 1];

  return (
    <div
      data-testid="timeline-river"
      className={cn("relative space-y-4", className)}
      aria-label="Daily timetable sequence"
    >
      <div className="relative pl-6 sm:pl-8 space-y-4">
        {/* Continuous vertical timeline connector line */}
        <div 
          className="absolute left-2 sm:left-2.5 top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-800" 
          aria-hidden 
        />

        {sorted.map((slot, index) => {
          const isOngoing = slot.status === "ongoing";
          const isCompleted = slot.status === "completed";
          const startH = parseHour(slot.startTime);
          const endH = parseHour(slot.endTime);
          const mins = Math.max(0, Math.round((endH - startH) * 60));
          const durationLabel = `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`;

          // Check if there was a gap between previous slot and current slot
          let breakDuration: number | null = null;
          if (index > 0) {
            const prevSlot = sorted[index - 1];
            const prevEnd = parseHour(prevSlot.endTime);
            const gap = Math.round((startH - prevEnd) * 60);
            if (gap >= 15) {
              breakDuration = gap;
            }
          }

          return (
            <div key={slot.id} className="relative space-y-3">
              {breakDuration && (
                <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground font-medium pl-2">
                  <span className="h-px w-6 bg-slate-200 dark:bg-slate-800" aria-hidden />
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 border text-[11px]">
                    Break • {breakDuration} mins
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden />
                </div>
              )}

              {/* Node indicator on the spine */}
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[20px] sm:-left-[28px] top-4.5 h-3.5 w-3.5 rounded-full border-2 bg-card transition-all z-10",
                  isOngoing
                    ? "border-primary bg-primary ring-4 ring-primary/20 scale-110"
                    : isCompleted
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 dark:border-slate-600 bg-background"
                )}
              />
              {isOngoing && (
                <span
                  aria-hidden
                  className="absolute -left-[20px] sm:-left-[28px] top-4.5 h-3.5 w-3.5 rounded-full bg-primary/40 animate-ping z-0"
                />
              )}

              {/* The Class Card Pill */}
              <div
                data-testid="timeline-pill"
                data-status={slot.status ?? "upcoming"}
                className={cn(
                  "group relative flex flex-col gap-2.5 rounded-2xl border p-4 transition-all hover:border-border hover:shadow-xs",
                  isOngoing
                    ? "border-primary/40 bg-primary/[0.04] shadow-xs ring-1 ring-primary/20"
                    : isCompleted
                      ? "border-border/40 bg-muted/15 opacity-85"
                      : "border-border/60 bg-card"
                )}
              >
                {/* Header row: time badge & status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums bg-muted border border-border/60 text-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {durationLabel}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      ({mins}m)
                    </span>
                    {slot.code && (
                      <span className="rounded-md border border-border/50 bg-secondary/80 px-2 py-0.5 text-xs font-bold tabular-nums text-secondary-foreground">
                        {slot.code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isOngoing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground animate-pulse">
                        <Radio className="h-3 w-3 animate-spin" aria-hidden /> Ongoing
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden /> Completed
                      </span>
                    )}
                    {renderActions && (
                      <div className="hidden sm:flex items-center gap-1">{renderActions(slot)}</div>
                    )}
                  </div>
                </div>

                {/* Subject & Details */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-base font-bold text-foreground leading-snug">
                      {slot.subject}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                      {slot.room && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          {slot.room.startsWith("Room") || slot.room.startsWith("Lab") ? slot.room : `Room ${slot.room}`}
                        </span>
                      )}
                      {slot.teacherName && (
                        <>
                          <span className="opacity-40">•</span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary text-[10px] font-bold text-secondary-foreground">
                              {slot.teacherName.charAt(0)}
                            </span>
                            {slot.teacherName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {renderActions && (
                    <div className="flex sm:hidden items-center gap-1">{renderActions(slot)}</div>
                  )}
                </div>

                {slot.notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">
                    Note: {slot.notes}
                  </p>
                )}

                {/* Left accent bar for ongoing */}
                {isOngoing && <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-2xl bg-primary" aria-hidden />}
              </div>
            </div>
          );
        })}

        {/* End cap */}
        <div className="flex items-center gap-2 pt-2 text-xs font-medium text-muted-foreground">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden />
          <span className="shrink-0 rounded-full border bg-card px-3 py-1 font-semibold text-xs shadow-2xs">
            Classes conclude at {formatTime12h(lastSlot.endTime)} • {sorted.length} slot{sorted.length === 1 ? "" : "s"}
          </span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden />
        </div>
      </div>
    </div>
  );
}
