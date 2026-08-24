"use client";

import { useState, useTransition } from "react";
import { Dropzone } from "@/components/files/dropzone";
import { FilePreview } from "@/components/files/file-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { saveSubmissionDraftAction, submitAssignmentAction } from "@/features/assignments/actions/assignments";
import { CheckCircle2, AlertCircle, Save, Send } from "lucide-react";

type Props = {
  homework: {
    id: string;
    title: string;
    description: string;
    subjectId: string;
    subject: { id: string; name: string; code: string };
    dueDate: Date | string;
  };
  existingSubmission?: {
    id: string;
    content: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    status: string;
  } | null;
};

function inferFileType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return ext || "file";
}

export function HomeworkDetailClient({ homework, existingSubmission }: Props) {
  const [content, setContent] = useState(existingSubmission?.content ?? "");
  const [fileUrl, setFileUrl] = useState<string | null>(existingSubmission?.fileUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(existingSubmission?.fileName ?? null);
  const [fileSize, setFileSize] = useState<number | null>(existingSubmission?.fileSize ?? null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dropzone with courseId linkage (subjectId) – passed as endpoint input via data attribute
  // UploadThing fileUrl will be stored as fileUrl=file.id (key/url) with status submitted on submit.
  const handleUploadComplete = (res: { url: string; key: string; name: string; size: number }[]) => {
    const f = res[0];
    if (f) {
      setFileUrl(f.url ?? f.key);
      setFileName(f.name);
      setFileSize(f.size);
      setMsg({ text: "File uploaded — click Submit to save.", type: "success" });
    }
  };

  const dispatch = (action: typeof saveSubmissionDraftAction | typeof submitAssignmentAction) => {
    const fd = new FormData();
    fd.set("homeworkId", homework.id);
    fd.set("content", content);
    if (fileUrl) fd.set("fileUrl", fileUrl);
    if (fileName) fd.set("fileName", fileName);
    if (fileSize) fd.set("fileSize", String(fileSize));
    startTransition(async () => {
      const res = await action(null, fd);
      setMsg({ text: res.message ?? (res.success ? "Saved." : "Failed."), type: res.success ? "success" : "error" });
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border bg-card p-6 space-y-2">
        <div className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 w-fit">{homework.subject.code}</div>
        <h1 className="text-2xl font-bold">{homework.title}</h1>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{homework.description}</p>
        <p className="text-xs text-muted-foreground">Due: {new Date(homework.dueDate).toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })}</p>
        <p className="text-xs text-muted-foreground">Course: {homework.subject.name} ({homework.subjectId})</p>
      </div>

      {msg && (
        <div role="status" className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${msg.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
          {msg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Your Submission</h2>
        <div className="space-y-2">
          <Label htmlFor="hw-content">Written solution (optional if file attached)</Label>
          <Textarea id="hw-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your solution or analysis..." rows={5} className="font-mono text-sm" />
        </div>

        <div className="space-y-2">
          <Label>Attachment — Dropzone (courseId={homework.subjectId})</Label>
          <div data-course-id={homework.subjectId}>
            <Dropzone endpoint="assignmentSubmission" onUploadComplete={handleUploadComplete} onUploadError={(err) => setMsg({ text: err.message, type: "error" })} />
          </div>
          <p className="text-xs text-muted-foreground">Uploading creates assignmentSubmissions row with fileUrl=file.key and status submitted on submit.</p>
        </div>

        {fileUrl && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <FilePreview fileUrl={fileUrl} fileType={inferFileType(fileUrl)} fileName={fileName ?? undefined} title={fileName ?? homework.title} />
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" disabled={isPending} onClick={() => dispatch(saveSubmissionDraftAction)} className="gap-1">
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button disabled={isPending || (!content && !fileUrl)} onClick={() => dispatch(submitAssignmentAction)} className="gap-1">
            <Send className="h-4 w-4" /> Submit (status: submitted)
          </Button>
        </div>
      </div>
    </div>
  );
}
