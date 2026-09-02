"use client";

import { useState } from "react";
import { saveExamResult } from "@/features/grades/actions/grade-actions";
import { Edit2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EditExamResultDialog({
  examId,
  studentId,
  examTitle,
  studentName,
  totalMarks,
  currentMarks,
  currentAbsent,
}: {
  examId: string;
  studentId: string;
  examTitle: string;
  studentName: string;
  totalMarks: number;
  currentMarks: number | null;
  currentAbsent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [obtainedMarks, setObtainedMarks] = useState<string>(
    currentMarks !== null ? String(currentMarks) : ""
  );
  const [isAbsent, setIsAbsent] = useState(currentAbsent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedMarks = isAbsent ? null : obtainedMarks.trim() !== "" ? Number(obtainedMarks) : null;
    const res = await saveExamResult(examId, studentId, {
      isAbsent,
      obtainedMarks: parsedMarks,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground transition-colors cursor-pointer"
        title={`Edit marks for ${studentName}`}
      >
        <Edit2 className="w-3 h-3 text-muted-foreground" /> Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold font-fira-sans">
            Edit Marks: {examTitle}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Student: <span className="font-semibold text-foreground">{studentName}</span> (Total Marks: {totalMarks})
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs font-semibold rounded bg-destructive/10 text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`absent-${examId}`}
              checked={isAbsent}
              onChange={(e) => setIsAbsent(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor={`absent-${examId}`} className="text-xs font-semibold text-foreground cursor-pointer">
              Mark Student as Absent (AB)
            </label>
          </div>

          {!isAbsent && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Obtained Marks (out of {totalMarks})
              </label>
              <input
                type="number"
                min="0"
                max={totalMarks}
                step="0.5"
                value={obtainedMarks}
                onChange={(e) => setObtainedMarks(e.target.value)}
                placeholder={`0 - ${totalMarks}`}
                className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                required={!isAbsent}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Marks
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
