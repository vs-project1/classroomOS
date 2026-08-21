"use client";

import { useActionState } from "react";
import { createNotice } from "@/features/notices/actions/notice-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function NoticeForm() {
  const [state, formAction, isPending] = useActionState(createNotice, null);

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      {state?.message && (
        <div className="p-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" required placeholder="e.g. Exam Schedule Postponed" />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-red-500">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content *</Label>
        <Textarea id="content" name="content" required placeholder="Detailed notice content..." className="min-h-[150px]" />
        {state?.fieldErrors?.content && (
          <p className="text-sm text-red-500">{state.fieldErrors.content[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
        {state?.fieldErrors?.expiresAt && (
          <p className="text-sm text-red-500">{state.fieldErrors.expiresAt[0]}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="isPinned" name="isPinned" value="on" />
        <Label htmlFor="isPinned" className="font-normal">
          Pin this notice to the top of the dashboard
        </Label>
      </div>

      <div className="pt-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
          {isPending ? "Publishing..." : "Publish Notice"}
        </Button>
      </div>
    </form>
  );
}
