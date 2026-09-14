import React from "react";
import { CheckCircle2, Clock, Edit, Laptop, MapPin, Radio, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { formatTime12h } from "@/lib/timezone";
import { DeleteRoutineButton } from "@/features/routine/components/delete-routine-button";

export type RoutineSlotData = {
  id: string;
  subjectName: string;
  subjectCode?: string | null;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherName?: string | null;
  status?: "upcoming" | "ongoing" | "completed";
  notes?: string | null;
  isLab?: boolean;
  semester?: string | null;
};

export type RoutineCardProps = {
  slot: RoutineSlotData;
  canManageRoutine?: boolean;
  renderActions?: (slot: RoutineSlotData) => React.ReactNode;
  compact?: boolean;
  className?: string;
  viewRole?: "TEACHER" | "STUDENT" | "ADMIN" | "CR";
};

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function RoutineCard({
  slot,
  canManageRoutine = false,
  renderActions,
  compact = false,
  className,
  viewRole,
}: RoutineCardProps) {
  const isOngoing = slot.status === "ongoing";
  const isCompleted = slot.status === "completed";
  
  const startM = parseMinutes(slot.startTime);
  const endM = parseMinutes(slot.endTime);
  const durationMins = Math.max(0, endM - startM);

  const isLab =
    slot.isLab ||
    slot.subjectName.toLowerCase().includes("lab") ||
    slot.subjectName.toLowerCase().includes("practical");

  return (
    <div
      data-testid="routine-card"
      data-status={slot.status ?? "upcoming"}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border transition-all duration-200",
        compact ? "p-2.5 space-y-2" : "p-4 space-y-3",
        isOngoing
          ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : isCompleted
          ? "border-border/40 bg-muted/20 opacity-80 hover:opacity-100"
          : "border-border/60 bg-card hover:border-border hover:shadow-xs",
        isLab && (compact ? "border-l-3 border-l-indigo-500 dark:border-l-indigo-400" : "border-l-4 border-l-indigo-500 dark:border-l-indigo-400"),
        className
      )}
    >
      {/* Ongoing left accent bar */}
      {isOngoing && !isLab && (
        <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-xl bg-primary" aria-hidden />
      )}

      {/* Top Header: Title & Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className={cn("font-bold text-foreground tracking-tight line-clamp-1", compact ? "text-xs" : "text-sm")}>
              {slot.subjectName}
            </h4>

            {slot.subjectCode && (
              <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border/40 tabular-nums">
                {slot.subjectCode}
              </span>
            )}

            {slot.semester && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
                Sem {slot.semester}
              </span>
            )}

            {isLab && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Laptop className="h-2.5 w-2.5" /> Lab
              </span>
            )}

            {isOngoing && (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider animate-pulse">
                <Radio className="h-2.5 w-2.5 animate-spin" /> NOW
              </span>
            )}

            {isCompleted && (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold border border-border/40">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> Done
              </span>
            )}
          </div>

          {/* Time & Location details */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-0.5">
            <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground/90">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
            </span>

            {!compact && durationMins > 0 && (
              <span className="text-[10px] font-semibold text-muted-foreground/80 tabular-nums">
                ({durationMins}m)
              </span>
            )}

            {slot.room && (
              <span className="inline-flex items-center gap-1 font-medium">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                {slot.room.startsWith("Room") ? slot.room : `Room ${slot.room}`}
              </span>
            )}
          </div>
        </div>

        {/* Action icons */}
        {renderActions ? (
          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            {renderActions(slot)}
          </div>
        ) : canManageRoutine ? (
          <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <Link
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "h-6 w-6 rounded-md cursor-pointer hover:bg-muted p-0",
              })}
              href={`/routine/${slot.id}/edit`}
              title={`Edit ${slot.subjectName}`}
              aria-label={`Edit ${slot.subjectName}`}
            >
              <Edit className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Link>
            <DeleteRoutineButton id={slot.id} />
          </div>
        ) : null}
      </div>

      {/* Footer: Teacher Name (for non-teachers) & Notes */}
      {(((viewRole !== "TEACHER" && slot.teacherName) || slot.notes) && !compact) && (
        <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
          {viewRole !== "TEACHER" && slot.teacherName && (
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {slot.teacherName.charAt(0)}
              </span>
              <span className="truncate max-w-[180px]">{slot.teacherName}</span>
            </span>
          )}

          {slot.notes && (
            <span className="italic text-muted-foreground/70 truncate max-w-[200px]">
              {slot.notes}
            </span>
          )}
        </div>
      )}

      {compact && viewRole !== "TEACHER" && slot.teacherName && (
        <div className="pt-1.5 border-t border-border/30 text-[10px] font-medium text-muted-foreground truncate">
          {slot.teacherName}
        </div>
      )}
    </div>
  );
}
