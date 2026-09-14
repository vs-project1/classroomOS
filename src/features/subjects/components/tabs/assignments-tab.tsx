import * as React from "react";
import Link from "next/link";
import { formatNepaliDateTime } from "@/lib/nepali-date";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface SubjectHomeworkItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | string;
  status: string;
}

export interface AssignmentsTabProps {
  assignments: SubjectHomeworkItem[];
}

export function AssignmentsTab({ assignments }: AssignmentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base text-foreground font-fira-sans">
            Subject Assignments & Tasks
          </h2>
          <Link
            href="/homework"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Go to Homework Hub →
          </Link>
        </div>

        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((hw) => {
              const dueDateFormatted = formatNepaliDateTime(
                new Date(hw.dueDate)
              );
              const isCompleted = hw.status === "completed";

              return (
                <div
                  key={hw.id}
                  className="p-4 rounded-xl border bg-muted/10 border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">
                        {hw.title}
                      </h3>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-md text-xs font-bold uppercase",
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                        )}
                      >
                        {hw.status}
                      </span>
                    </div>
                    {hw.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {hw.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground font-medium">
                      Due: {dueDateFormatted}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <Link
                      href="/homework"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "cursor-pointer",
                      })}
                    >
                      View Assignment
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            className="py-12 max-w-full"
            description="No active or upcoming assignments for this subject."
          />
        )}
      </div>
    </div>
  );
}
