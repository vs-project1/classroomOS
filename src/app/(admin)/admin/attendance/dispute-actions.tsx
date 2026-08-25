"use client";

import * as React from "react";
import { useActionState } from "react";
import { reviewDisputeAction } from "@/features/attendance/actions/dispute-review";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export function DisputeActions({ disputeId }: { disputeId: string }) {
  const [reviewNote, setReviewNote] = React.useState("");
  const [state, formAction, pending] = useActionState(
    async (_prev: { success: boolean; message: string } | null, formData: FormData) => {
      const res = await reviewDisputeAction(formData);
      if (res.success) toast.success(res.message);
      else if (res.message) toast.error(res.message);
      return res;
    },
    null
  );

  const handleReject: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (!reviewNote.trim()) {
      e.preventDefault();
      toast.error("Please add a review note when rejecting.");
      return;
    }
    if (!window.confirm("Reject this correction request? This cannot be undone.")) {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <form action={formAction}>
          <input type="hidden" name="disputeId" value={disputeId} />
          <input type="hidden" name="action" value="approve" />
          <input type="hidden" name="reviewNote" value={reviewNote} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            aria-live="polite"
            className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
          </Button>
        </form>
        <form action={formAction} onSubmit={handleReject}>
          <input type="hidden" name="disputeId" value={disputeId} />
          <input type="hidden" name="action" value="reject" />
          <input type="hidden" name="reviewNote" value={reviewNote} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            aria-live="polite"
            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
        </form>
        {state && !state.success && (
          <span role="alert" className="text-xs text-destructive">{state.message}</span>
        )}
        {state && state.success && (
          <span role="status" className="text-xs text-emerald-600">{state.message}</span>
        )}
      </div>
      <input
        type="text"
        placeholder="Review note (required for reject, optional for approve)"
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
      />
    </div>
  );
}
