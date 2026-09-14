import * as React from "react";
import { Clock } from "lucide-react";
import { formatTime12h } from "@/lib/timezone";
import { EmptyState } from "@/components/ui/empty-state";

export interface SubjectSessionItem {
  id: string;
  sessionDate: Date | string;
  startTime: string;
  endTime: string;
  lectureLog?: {
    topicsCovered: string;
    notes?: string | null;
    homework?: string | null;
  } | null;
}

export interface ClassesTabProps {
  sessions: SubjectSessionItem[];
}

export function ClassesTab({ sessions }: ClassesTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-foreground font-fira-sans">
            Class History
          </h2>
          <span className="text-sm text-foreground/80 font-bold">
            {sessions.length} Recorded Session{sessions.length === 1 ? "" : "s"}
          </span>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session, idx) => {
              const sDate = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Kathmandu",
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(session.sessionDate));

              return (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl border bg-card border-border/80 space-y-3 hover:border-primary/50 transition-all shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary font-mono">
                        Session #{sessions.length - idx}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {sDate}
                      </span>
                    </div>
                    <div className="text-sm text-foreground/80 flex items-center gap-1.5 font-semibold">
                      <Clock className="w-4 h-4 text-primary" />
                      {formatTime12h(session.startTime)} -{" "}
                      {formatTime12h(session.endTime)}
                    </div>
                  </div>

                  {session.lectureLog ? (
                    <div className="space-y-2 pt-1">
                      <div>
                        <span className="text-sm font-bold text-foreground block mb-0.5">
                          Topics Covered:
                        </span>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                          {session.lectureLog.topicsCovered}
                        </p>
                      </div>

                      {session.lectureLog.notes && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2">
                          <span className="font-bold text-amber-800 dark:text-amber-400 shrink-0">
                            Notes:
                          </span>
                          <span>{session.lectureLog.notes}</span>
                        </div>
                      )}

                      {session.lectureLog.homework && (
                        <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-start gap-2">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                            Assigned Task:
                          </span>
                          <span>{session.lectureLog.homework}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-1 text-xs text-foreground/70 font-medium">
                      Session conducted on schedule. No additional lecture
                      notes.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            className="py-12 max-w-full"
            description="No class sessions have been logged yet for this subject."
          />
        )}
      </div>
    </div>
  );
}
