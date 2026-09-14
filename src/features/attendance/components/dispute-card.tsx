import * as React from "react";
import { formatNepaliDate } from "@/lib/nepali-date";
import { toOrdinalSemester } from "@/lib/utils/roman";
import { DisputeActions } from "./dispute-actions";
import { cn } from "@/lib/utils";

export interface DisputeItem {
  id: string;
  requestedStatus: string;
  reason: string;
  status: string;
  reviewNote?: string | null;
  createdAt?: Date | string;
  studentName: string;
  studentRoll: string;
  semester: string;
  sessionDate: Date | string;
}

export interface DisputeCardProps {
  req: DisputeItem;
  showActions?: boolean;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800",
};

export function DisputeCard({
  req,
  showActions = false,
  className,
}: DisputeCardProps) {
  const sessionDate =
    req.sessionDate instanceof Date
      ? formatNepaliDate(req.sessionDate, "YYYY MMMM DD")
      : typeof req.sessionDate === "string"
        ? formatNepaliDate(new Date(req.sessionDate), "YYYY MMMM DD")
        : String(req.sessionDate);

  return (
    <div
      data-slot="dispute-card"
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">{req.studentName}</span>
            <span className="text-xs text-muted-foreground font-mono">
              ({req.studentRoll})
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {toOrdinalSemester(req.semester)}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border",
                statusColors[req.status] || "bg-muted text-muted-foreground"
              )}
            >
              {req.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Session Date: {sessionDate} (B.S.)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-muted-foreground">Requested:</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
            Mark as {req.requestedStatus}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-xs">
        <span className="font-semibold text-foreground">Reason: </span>
        <span className="text-muted-foreground">{req.reason}</span>
      </div>

      {req.reviewNote && (
        <div className="p-3 rounded-xl bg-muted/20 border border-border/20 text-xs">
          <span className="font-semibold text-foreground">Review Note: </span>
          <span className="text-muted-foreground">{req.reviewNote}</span>
        </div>
      )}

      {showActions && (
        <div className="pt-2 border-t border-border/30">
          <DisputeActions disputeId={req.id} />
        </div>
      )}
    </div>
  );
}
