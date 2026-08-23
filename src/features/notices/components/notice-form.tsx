"use client";

import { useActionState, useState } from "react";
import { createNotice } from "@/features/notices/actions/notice-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropzone } from "@/components/files/dropzone";
import { FileText, X, Paperclip } from "lucide-react";

export function NoticeForm() {
  const [state, formAction, isPending] = useActionState(createNotice, null);
  const [attachments, setAttachments] = useState<{ url: string; key: string; name: string; size: number }[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);

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
        {/* Rich text: textarea with larger min-height; TipTap can replace this without changing form name */}
        <Textarea id="content" name="content" required placeholder="Detailed notice content... Supports markdown / rich text" className="min-h-[180px] font-mono text-sm" />
        {state?.fieldErrors?.content && (
          <p className="text-sm text-red-500">{state.fieldErrors.content[0]}</p>
        )}
        <p className="text-xs text-muted-foreground">Tip: use line breaks for paragraphs. Rich formatting (bold, lists) will be preserved via FilePreview attachments.</p>
      </div>

      <div className="space-y-2">
        <Label>Attachments (optional)</Label>
        <Dropzone
          endpoint="noticeAttachment"
          onUploadComplete={(res) => {
            setAttachments((prev) => [...prev, ...res]);
            setAttachError(null);
          }}
          onUploadError={(err) => setAttachError(err.message)}
        />
        {attachError && <p className="text-sm text-destructive">{attachError}</p>}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.key} className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{a.name}</span>
                  <span className="text-muted-foreground">({Math.round(a.size / 1024)} KB)</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.key !== a.key))}
                  className="p-1 hover:text-destructive rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Hidden JSON field consumed by server action */}
        <input type="hidden" name="attachments" value={JSON.stringify(attachments.map((a) => a.url))} />
        {state?.fieldErrors?.attachments && (
          <p className="text-sm text-red-500">{state.fieldErrors.attachments[0]}</p>
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
