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
  startHour = DEFAULT_START,
  endHour = DEFAULT_END,
  renderActions,
}: TimelineRiverProps) {
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

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

  return (
    <div
      data-testid="timeline-river"
      className={cn("relative flex gap-4", className)}
      aria-label="Daily timetable from 7 AM to 4 PM"
    >
      {/* Time gutter + vertical line */}
      <div className="relative hidden w-16 shrink-0 sm:block">
        <div className="absolute right-0 top-0 bottom-0 w-0 border-l-2 border-slate-100 dark:border-slate-800" aria-hidden />
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              className="relative flex h-[52px] items-start justify-end pr-3"
              style={{ height: h === endHour ? 24 : 52 }}
            >
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground tabular-nums -mt-1.5">
                {hourLabel(h)}
              </span>
              <span className="absolute right-0 top-[6px] h-1.5 w-1.5 -translate-x-[-1px] rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Vertical line for mobile (left edge) */}
      <div className="absolute left-0 top-0 bottom-0 border-l-2 border-slate-100 dark:border-slate-800 sm:hidden" aria-hidden />

      {/* Pills column — also carries the spec-required border-l-2 */}
      <div className="flex-1 space-y-3 border-l-2 border-slate-100 pl-4 dark:border-slate-800 sm:border-l-0 sm:pl-0">
        {sorted.map((slot) => {
          const isOngoing = slot.status === "ongoing";
          const isCompleted = slot.status === "completed";
          const startH = parseHour(slot.startTime);
          const endH = parseHour(slot.endTime);
          const durationLabel = `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`;
          // Visual offset hint (not absolute positioning, keeps pills accessible and prevents overlap)
          const isEarly = startH < 9;
          const isLate = startH >= 12;

          return (
            <div
              key={slot.id}
              data-testid="timeline-pill"
              data-status={slot.status ?? "upcoming"}
              className={cn(
                "group relative flex flex-col gap-2 rounded-xl border p-3 pr-3 transition-all hover:-translate-y-[1px] sm:p-4",
                isOngoing
                  ? "border-primary/40 bg-primary/5 shadow-md ring-1 ring-primary/20"
                  : isCompleted
                    ? "border-border/30 bg-muted/15 opacity-75 grayscale-[0.15] hover:opacity-100 hover:grayscale-0"
                    : "border-border/40 bg-card hover:border-border hover:shadow-sm",
                isEarly && !isOngoing && !isCompleted && "sm:ml-1",
                isLate && !isOngoing && !isCompleted && "sm:ml-2"
              )}
            >
              {/* Dot on the river line */}
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[21px] top-5 hidden h-3 w-3 rounded-full border-2 bg-card sm:block",
                  isOngoing
                    ? "border-primary bg-primary shadow-[0_0_0_4px_rgba(79,70,229,0.15)]"
                    : isCompleted
                      ? "border-slate-300 bg-slate-300 dark:border-slate-600 dark:bg-slate-600"
                      : "border-slate-200 bg-white dark:border-slate-700"
                )}
              />
              {isOngoing && (
                <span
                  aria-hidden
                  className="absolute -left-[21px] top-5 hidden h-3 w-3 rounded-full bg-primary/30 animate-ping sm:block"
                />
              )}

              {/* Mobile dot */}
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[9px] top-5 h-2.5 w-2.5 rounded-full border-2 sm:hidden",
                  isOngoing
                    ? "border-primary bg-primary animate-pulse"
                    : isCompleted
                      ? "border-slate-300 bg-slate-200"
                      : "border-slate-200 bg-white"
                )}
              />

              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-foreground">{slot.subject}</h4>
                    {slot.code && (
                      <span className="shrink-0 rounded-md border border-border/50 bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">
                        {slot.code}
                      </span>
                    )}
                    {isOngoing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground animate-pulse">
                        <Radio className="h-3 w-3 animate-spin" aria-hidden /> Now
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted px-2.5 py-0.5 text-xs font-bold uppercase text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden /> Done
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                      {durationLabel}
                    </span>
                    {slot.room && (
                      <>
                        <span className="opacity-40" aria-hidden>
                          •
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          {slot.room.startsWith("Room") ? slot.room : `Room ${slot.room}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Duration hint */}
                <span className="hidden shrink-0 text-xs font-semibold tabular-nums text-muted-foreground sm:inline">
                  {(() => {
                    const mins = Math.round((endH - startH) * 60);
                    return `${mins}m`;
                  })()}
                </span>
                {renderActions && (
                  <span className="hidden shrink-0 items-center gap-1 sm:flex">{renderActions(slot)}</span>
                )}
              </div>
              {renderActions && (
                <div className="flex items-center gap-1 sm:hidden">{renderActions(slot)}</div>
              )}

              {(slot.teacherName || slot.notes) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {slot.teacherName && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary text-xs font-bold text-secondary-foreground">
                        {slot.teacherName.charAt(0)}
                      </span>
                      <User className="h-3 w-3 opacity-60 sm:hidden" aria-hidden />
                      {slot.teacherName}
                    </span>
                  )}
                  {slot.notes && (
                    <span className="italic opacity-80 line-clamp-1">— {slot.notes}</span>
                  )}
                </div>
              )}

              {/* Current pulse bar (left accent) */}
              {isOngoing && <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-primary" aria-hidden />}
            </div>
          );
        })}

        {/* End cap */}
        <div className="flex items-center gap-2 pt-1 text-xs font-medium text-muted-foreground">
          <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" aria-hidden />
          <span className="shrink-0 rounded-full border bg-card px-2 py-0.5">4 PM — End of day</span>
          <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" aria-hidden />
        </div>
      </div>
    </div>
  );
}
