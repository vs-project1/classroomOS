"use client";

import { useActionState } from "react";
import { reviewDisputeAction } from "@/features/attendance/actions/dispute-review";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export function DisputeActions({ disputeId }: { disputeId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { success: boolean; message: string } | null, formData: FormData) => {
      return reviewDisputeAction(formData);
    },
    null
  );

  return (
    <div className="flex items-center gap-2">
      <form action={formAction}>
        <input type="hidden" name="disputeId" value={disputeId} />
        <input type="hidden" name="action" value="approve" />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Approve
        </Button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="disputeId" value={disputeId} />
        <input type="hidden" name="action" value="reject" />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
        >
          <XCircle className="w-4 h-4 mr-1" />
          Reject
        </Button>
      </form>
      {state && !state.success && (
        <span className="text-xs text-destructive">{state.message}</span>
      )}
    </div>
  );
}
