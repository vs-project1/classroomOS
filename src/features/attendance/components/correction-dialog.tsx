"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { submitAttendanceCorrectionAction, AttendanceActionState } from "@/features/attendance/actions/dispute";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

interface SessionOption {
  id: string;
  dateFormatted: string;
  subjectName: string;
  status: string;
}

interface CorrectionDialogProps {
  recentSessions: SessionOption[];
}

const initialState: AttendanceActionState = { success: false };

export function CorrectionDialog({ recentSessions }: CorrectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [state, formAction, isPending] = useActionState(submitAttendanceCorrectionAction, initialState);

  useEffect(() => {
    if ((state as unknown) === initialState) return;
    if (state.success) {
      toast.success("Correction request sent.", { description: "Your teacher will review it shortly." });
    } else if (state.message && !(state.fieldErrors && Object.keys(state.fieldErrors).length > 0)) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Reset stale success/error when dialog closes so reopen starts fresh
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && state.success) setResetKey((k) => k + 1);
    // Also clear error state on close by remounting via key
    if (!nextOpen && !state.success && state.message) setResetKey((k) => k + 1);
    setOpen(nextOpen);
  };

  return (
    <Dialog key={resetKey} open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 text-xs font-medium cursor-pointer" />
        }
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
        Report Incorrect Attendance
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Attendance Correction</DialogTitle>
          <DialogDescription>
            Submit an attendance dispute if a session was mistakenly marked absent or late.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Dispute Request Submitted</p>
              <p className="text-xs text-muted-foreground mt-1">
                {state.message || "Your correction request was submitted. Status: Pending review."}
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={() => setOpen(false)} size="sm">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-3 pt-1">
            {state.message && !state.success && (
              <div className="p-2.5 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <div>
              <label htmlFor="attendanceId" className="block text-xs font-semibold text-foreground mb-1">
                Select Lecture Session
              </label>
              {(() => {
                const disputable = recentSessions.filter((s) => s.status === "absent" || s.status === "late");
                return disputable.length > 0 ? (
                <select
                  name="attendanceId"
                  id="attendanceId"
                  required
                  className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {disputable.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName} ({s.dateFormatted}) — Marked {s.status.toUpperCase()}
                    </option>
                  ))}
                </select>
                ) : (
                <div className="text-xs text-muted-foreground p-2 rounded border bg-muted/20">
                  {recentSessions.length > 0
                    ? "No disputable records — only absent/late sessions can be disputed. Present/excused sessions are not shown."
                    : "No attendance records available to dispute."}
                </div>
                );
              })()}
            </div>

            <div>
              <label htmlFor="requestedStatus" className="block text-xs font-semibold text-foreground mb-1">
                Requested Status
              </label>
              <select
                name="requestedStatus"
                id="requestedStatus"
                defaultValue="present"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="present">Present (In-Person Attendance)</option>
                <option value="excused">Excused (Medical / Institutional Leave)</option>
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-xs font-semibold text-foreground mb-1">
                Reason & Context
              </label>
              <textarea
                name="reason"
                id="reason"
                rows={2}
                required
                placeholder="Explain why this record should be corrected..."
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {state.fieldErrors?.reason && (
                <p className="text-xs font-medium text-destructive mt-1">{state.fieldErrors.reason[0]}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending || recentSessions.filter((s) => s.status === "absent" || s.status === "late").length === 0}>
                {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
