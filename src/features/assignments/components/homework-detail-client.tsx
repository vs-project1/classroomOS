"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  toggleHomeworkCompletionAction,
  submitAssignmentAction,
} from "@/features/assignments/actions/assignments";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  PenTool,
  Link as LinkIcon,
  ExternalLink,
  Edit2,
  Send,
} from "lucide-react";
import { formatNepaliDate } from "@/lib/nepali-date";
import { DriveSubmissionPreview } from "./drive-submission-preview";
import { validateGoogleDriveUrl } from "@/features/assignments/utils/drive";

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
    fileUrl?: string | null;
    fileName?: string | null;
  } | null;
};

export function HomeworkDetailClient({ homework, existingSubmission }: Props) {
  const [isCompleted, setIsCompleted] = useState(
    existingSubmission?.status === "submitted" || existingSubmission?.status === "completed"
  );
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Digital Google Drive Submission state
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(
    existingSubmission?.fileUrl ?? null
  );
  const [driveInput, setDriveInput] = useState<string>(existingSubmission?.fileUrl ?? "");
  const [isEditingLink, setIsEditingLink] = useState<boolean>(!existingSubmission?.fileUrl);
  const [driveMsg, setDriveMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isDrivePending, startDriveTransition] = useTransition();

  const handleDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveInput.trim()) {
      setDriveMsg({ text: "Please provide a valid Google Drive link.", type: "error" });
      return;
    }

    const validation = validateGoogleDriveUrl(driveInput.trim());
    if (!validation.isValid) {
      setDriveMsg({ text: validation.error || "Invalid Google Drive URL.", type: "error" });
      return;
    }

    startDriveTransition(async () => {
      const formData = new FormData();
      formData.append("homeworkId", homework.id);
      formData.append("fileUrl", driveInput.trim());
      formData.append("fileName", `${homework.title} - Solution`);

      const res = await submitAssignmentAction(null, formData);
      if (res.success) {
        setCurrentFileUrl(driveInput.trim());
        setIsEditingLink(false);
        setIsCompleted(true);
        setDriveMsg({ text: res.message || "Google Drive submission saved!", type: "success" });
      } else {
        setDriveMsg({
          text: res.message || res.fieldErrors?.fileUrl?.[0] || "Failed to submit Google Drive link.",
          type: "error",
        });
      }
    });
  };

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

      {/* Digital Google Drive Deliverable & SpeedGrader Preview */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base text-foreground">Digital Deliverable (Google Drive)</h2>
          </div>
          {currentFileUrl && !isEditingLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingLink(true)}
              className="gap-1.5 text-xs font-medium"
            >
              <Edit2 className="w-3.5 h-3.5" /> Change Link
            </Button>
          )}
        </div>

        {driveMsg && (
          <div
            role="status"
            className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              driveMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            {driveMsg.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{driveMsg.text}</span>
          </div>
        )}

        {currentFileUrl && !isEditingLink ? (
          <div className="space-y-3">
            <DriveSubmissionPreview
              fileUrl={currentFileUrl}
              fileName={`${homework.title} - Solution`}
              title={homework.title}
            />
          </div>
        ) : (
          <form onSubmit={handleDriveSubmit} className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Attach a Google Doc, Sheet, Slides, or Drive file for digital review and inline previewing (SpeedGrader style).
              Ensure your document sharing is set to <em>&quot;Anyone with the link can view&quot;</em>.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="url"
                value={driveInput}
                onChange={(e) => setDriveInput(e.target.value)}
                placeholder="https://docs.google.com/document/d/... or drive.google.com/file/d/..."
                required
                className="flex-1 text-xs"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isDrivePending || !driveInput.trim()}
                  size="sm"
                  className="gap-1.5 font-semibold text-xs shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isDrivePending ? "Saving..." : currentFileUrl ? "Update Link" : "Submit Link"}
                </Button>
                {currentFileUrl && isEditingLink && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDriveInput(currentFileUrl);
                      setIsEditingLink(false);
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

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
