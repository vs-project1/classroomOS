import * as React from "react";
import { MapPin } from "lucide-react";
import type { SubjectProgress } from "@/features/subjects/queries";

export interface OverviewTabProps {
  progress: SubjectProgress | null;
  progressPercent: number;
  coveredChapters: number;
  totalChapters: number;
}

export function OverviewTab({
  progress,
  progressPercent,
  coveredChapters,
  totalChapters,
}: OverviewTabProps) {
  if (!progress) return null;

  return (
    <div
      className="p-6 rounded-2xl border bg-card shadow-sm space-y-2.5"
      data-testid="subject-overview-body"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {progress.currentChapter ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 max-w-full">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Currently on: {progress.currentChapter.unitTitle} —{" "}
              {progress.currentChapter.chapterTitle}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold border border-border">
            Not started
          </span>
        )}
        <span className="text-xs text-muted-foreground font-semibold">
          {coveredChapters}/{totalChapters} chapters covered
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPercent}% of chapters covered`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
          {progressPercent}%
        </span>
      </div>

      <p className="pt-2 text-sm text-muted-foreground">
        Track this subject&apos;s syllabus progress, class history, assignments,
        and study materials from the tabs above.
      </p>
    </div>
  );
}
