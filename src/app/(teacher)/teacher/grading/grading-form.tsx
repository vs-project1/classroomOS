"use client";

import { useActionState } from "react";
import { gradeSubmissionAction, GradingActionResult } from "@/features/assignments/actions/grading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, PenLine, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

interface SubmissionData {
  submission: {
    id: string;
    homeworkId: string;
    studentId: string;
    content: string | null;
    fileUrl: string | null;
    fileName: string | null;
    status: string;
    submittedAt: Date | null;
    grade: string | null;
    score: number | null;
    feedback: string | null;
    gradedBy: string | null;
    gradedAt: Date | null;
  };
  homework: {
    id: string;
    title: string;
    description: string;
    dueDate: Date;
  };
  student: {
    id: string;
    name: string;
    rollNumber: string;
  };
  subject: {
    id: string;
    name: string;
  };
}

function GradingFormDialog({ studentName, homeworkTitle, submissionId }: { studentName: string; homeworkTitle: string; submissionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(gradeSubmissionAction, null as GradingActionResult | null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PenLine className="w-4 h-4 mr-1.5" />
        Grade
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
          <DialogDescription>
            Assign a score for {studentName}&apos;s work on {homeworkTitle}.
          </DialogDescription>
        </DialogHeader>

        {state?.success ? (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Grade Submitted</p>
              <p className="text-xs text-muted-foreground mt-1">
                {state.message || "The submission has been graded successfully."}
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={() => setOpen(false)} size="sm">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="submissionId" value={submissionId} />
            {state?.message && !state.success && (
              <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor={`score-${submissionId}`}>Score (0-100)</Label>
              <Input
                id={`score-${submissionId}`}
                name="score"
                type="number"
                min={0}
                max={100}
                required
                placeholder="e.g. 85"
                disabled={isPending}
              />
              {state?.fieldErrors?.score && (
                <p className="text-sm text-destructive">{state.fieldErrors.score[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`feedback-${submissionId}`}>Feedback (optional)</Label>
              <Textarea
                id={`feedback-${submissionId}`}
                name="feedback"
                placeholder="Add comments about the student's work..."
                disabled={isPending}
                rows={3}
              />
              {state?.fieldErrors?.feedback && (
                <p className="text-sm text-destructive">{state.fieldErrors.feedback[0]}</p>
              )}
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Submit Grade
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeedbackExpandable({ feedback }: { feedback: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide feedback" : "Show feedback"}
      </button>
      {expanded && (
        <p className="text-sm text-muted-foreground mt-1 p-2 rounded bg-muted/50 border">
          {feedback}
        </p>
      )}
    </div>
  );
}

export function GradingSubmissionList({ submissions }: { submissions: SubmissionData[] }) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p>No submissions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map(({ submission, homework, student, subject }) => {
        const isGraded = submission.status === "graded";
        return (
          <div
            key={submission.id}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg shrink-0 mt-1">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{homework.title}</h3>
                  <Badge variant={isGraded ? "default" : submission.status === "submitted" ? "secondary" : "outline"}>
                    {submission.status}
                  </Badge>
                  {isGraded && submission.score != null && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                      Score: {submission.score}/100
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{student.name}</span> ({student.rollNumber}) &bull; {subject.name}
                </p>
                {submission.submittedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                )}
                {isGraded && submission.feedback && (
                  <FeedbackExpandable feedback={submission.feedback} />
                )}
              </div>
            </div>
            <div className="flex shrink-0">
              {isGraded ? (
                <Badge variant="default">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Graded
                </Badge>
              ) : (
                <GradingFormDialog
                  studentName={student.name}
                  homeworkTitle={homework.title}
                  submissionId={submission.id}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
