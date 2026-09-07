"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleHomeworkCompletionAction } from "@/features/assignments/actions/assignments";
import { CheckCircle2, AlertCircle, Calendar, Book, Clock, PenTool } from "lucide-react";
import { formatNepaliDate } from "@/lib/nepali-date";

type Props = {
  homework: {
    id: string;
    title: string;
    description: string;
    subjectId: string;
    subject: { id: string; name: string; code: string };
    dueDate: Date | string;
    assignedDate?: Date | string;
  };
  existingSubmission?: {
    id: string;
    content: string | null;
    status: string;
  } | null;
};

export function HomeworkDetailClient({ homework, existingSubmission }: Props) {
  const [isCompleted, setIsCompleted] = useState(
    existingSubmission?.status === "submitted" || existingSubmission?.status === "completed"
  );
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const res = await toggleHomeworkCompletionAction(homework.id);
      if (res.success) {
        setIsCompleted(res.completed);
        setMsg({ text: res.message ?? "Updated successfully.", type: "success" });
      } else {
        setMsg({ text: res.message ?? "Failed to update status.", type: "error" });
      }
    });
  };

  const dueDateObj = new Date(homework.dueDate);
  const isOverdue = dueDateObj.getTime() < Date.now();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Assignment Header Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
            {homework.subject.code}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isCompleted
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : isOverdue
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {isCompleted ? "Completed in Notebook" : isOverdue ? "Overdue" : "Pending"}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold font-fira-sans text-foreground">{homework.title}</h1>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
            {homework.subject.name}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Instructions &amp; Questions
          </span>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {homework.description || "No specific instructions provided."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong className="text-foreground">Due Date:</strong>{" "}
              {formatNepaliDate(dueDateObj)} (B.S.)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>
              {new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Kathmandu",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }).format(dueDateObj)}
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <div
          role="status"
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Handwritten Notebook Tracking Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-base text-foreground">Handwritten Notebook Status</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          In ClassroomOS, homework is written by hand in your physical notebooks. Use this tracker to mark
          when you have completed this deliverable in your copy so your pending task list stays up-to-date.
        </p>

        <div className="pt-2 flex items-center justify-between border-t border-border/40">
          <span className="text-xs font-medium text-muted-foreground">
            Current state:{" "}
            <strong className="text-foreground">
              {isCompleted ? "Marked as completed" : "Not yet finished"}
            </strong>
          </span>

          <Button
            disabled={isPending}
            onClick={handleToggle}
            variant={isCompleted ? "outline" : "default"}
            className="gap-2 font-semibold"
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed in Copy (Undo)
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" /> Mark as Done in Notebook
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
