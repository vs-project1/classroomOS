"use client";

import { useActionState, useState, useEffect } from "react";
import { toast } from "sonner";
import { createResourceAction } from "@/features/resources/actions/resources";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  Paperclip,
  Link as LinkIcon,
  Presentation,
  CheckCircle2,
  FileText,
  Upload,
} from "lucide-react";
import { uploadFiles } from "@/utils/uploadthing";
import { parseGoogleDriveUrl } from "@/lib/google-drive";
import { cn } from "@/lib/utils";

type UploadedFile = {
  url: string;
  key: string;
  name: string;
  size: number;
};

const EXT_TO_FILE_TYPE: Record<string, string> = {
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  rtf: "doc",
  odt: "doc",
  ppt: "slides",
  pptx: "slides",
  key: "slides",
  zip: "zip",
  rar: "zip",
  "7z": "zip",
  tar: "zip",
  gz: "zip",
  txt: "text",
  md: "text",
  csv: "text",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  avif: "image",
  js: "code",
  ts: "code",
  jsx: "code",
  tsx: "code",
  py: "code",
  java: "code",
  c: "code",
  cpp: "code",
  cs: "code",
  go: "code",
  rs: "code",
  php: "code",
  rb: "code",
  json: "code",
  xml: "code",
  yml: "code",
  yaml: "code",
  html: "code",
  css: "code",
  sql: "code",
  sh: "code",
};

function detectFileType(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_FILE_TYPE[ext] ?? null;
}

export interface AddResourceModalProps {
  subjectId: string;
  subjectName?: string;
  unitId?: string | null;
  unitTitle?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  targetLabel?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddResourceModal({
  subjectId,
  subjectName,
  unitId,
  unitTitle,
  chapterId,
  chapterTitle,
  targetLabel,
  trigger,
  onSuccess,
}: AddResourceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"gdrive" | "upload" | "link">("gdrive");
  const [fileType, setFileType] = useState<string>("slides");
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [state, formAction, isPending] = useActionState(createResourceAction, null);

  // Sync action feedback
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || "Resource published successfully!");
      setIsOpen(false);
      setUploadedFile(null);
      setLinkUrl("");
      onSuccess?.();
    } else if (state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  const handleLinkUrlChange = (url: string) => {
    setLinkUrl(url);
    const parsed = parseGoogleDriveUrl(url);
    if (parsed.isGoogleDrive) {
      if (parsed.type === "presentation" || parsed.type === "drive_file") {
        setFileType("slides");
      } else if (parsed.type === "document") {
        setFileType("doc");
      }
    }
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const uploadPromise = uploadFiles("courseMaterial", { files: [file] })
      .then((data) => {
        const uploaded = data[0];
        setUploadedFile({
          url: uploaded.url,
          key: uploaded.key,
          name: uploaded.name,
          size: uploaded.size,
        });
        const detected = detectFileType(uploaded.name);
        if (detected) setFileType(detected);
        return uploaded;
      })
      .catch((error) => {
        setUploadedFile(null);
        throw error;
      })
      .finally(() => {
        setIsUploading(false);
      });

    toast.promise(uploadPromise, {
      loading: "Uploading file…",
      success: (uploaded) => `${uploaded.name} uploaded successfully`,
      error: "Upload failed. Please try again.",
    });
  };

  const effectiveFileUrl = mode === "upload" ? (uploadedFile?.url ?? "") : linkUrl;
  const canSubmit =
    !isPending &&
    !isUploading &&
    (mode === "upload" ? Boolean(uploadedFile?.url) : Boolean(linkUrl.trim()));

  // Determine target display label
  const resolvedTarget =
    targetLabel ??
    (chapterTitle
      ? `Chapter: ${chapterTitle}`
      : unitTitle
      ? `Unit: ${unitTitle}`
      : "Subject-wide Material");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 shadow-xs">
              <Plus className="w-3.5 h-3.5 text-primary" /> Add Resource
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span>Add Resource</span>
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="secondary" className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20 max-w-full truncate">
              {subjectName ? `${subjectName} › ` : ""}{resolvedTarget}
            </Badge>
          </div>
        </DialogHeader>

        <form action={formAction} className="space-y-4 pt-1">
          <input type="hidden" name="subjectId" value={subjectId} />
          {unitId && <input type="hidden" name="unitId" value={unitId} />}
          {chapterId && <input type="hidden" name="chapterId" value={chapterId} />}
          <input type="hidden" name="fileUrl" value={effectiveFileUrl} />
          <input type="hidden" name="fileType" value={fileType} />
          {uploadedFile && (
            <>
              <input type="hidden" name="fileSize" value={uploadedFile.size} />
              <input type="hidden" name="fileKey" value={uploadedFile.key} />
            </>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-title" className="text-xs font-semibold">
              Resource Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="resource-title"
              name="title"
              required
              placeholder="e.g. Unit Master Slides, Lab Guide, Reference Notes"
              className="text-sm"
              autoFocus
            />
            {state?.fieldErrors?.title && (
              <p className="text-destructive text-xs">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          {/* Source Mode Tabs */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Resource Source</Label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("gdrive");
                  setFileType("slides");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-all",
                  mode === "gdrive"
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Presentation className="w-3.5 h-3.5 text-amber-500" />
                <span>Drive Slides</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("upload")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-all",
                  mode === "upload"
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                <span>Direct File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("link");
                  setFileType("link");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-all",
                  mode === "link"
                    ? "bg-background shadow-xs text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Web Link</span>
              </button>
            </div>
          </div>

          {/* Mode Content */}
          {mode === "gdrive" && (
            <div className="space-y-2 p-3 bg-muted/30 border rounded-lg">
              <Label htmlFor="gdrive-url" className="text-xs font-medium text-foreground">
                Google Drive / Slides Link
              </Label>
              <Input
                id="gdrive-url"
                type="url"
                placeholder="https://docs.google.com/presentation/d/... or drive.google.com/file/..."
                value={linkUrl}
                onChange={(e) => handleLinkUrlChange(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Share permission must be set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong> in Google Drive.
              </p>
            </div>
          )}

          {mode === "upload" && (
            <div className="space-y-2 p-3 bg-muted/30 border rounded-lg">
              <Label className="text-xs font-medium text-foreground">Upload Document or File</Label>
              {uploadedFile ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium truncate text-emerald-950 dark:text-emerald-100">
                      {uploadedFile.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive px-2"
                    onClick={() => setUploadedFile(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors text-center">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileSelected}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Uploading file...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs font-medium text-foreground">Click to browse or drop file</span>
                      <span className="text-[11px] text-muted-foreground">PDF, PPTX, ZIP, DOCX up to 32MB</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          )}

          {mode === "link" && (
            <div className="space-y-2 p-3 bg-muted/30 border rounded-lg">
              <Label htmlFor="web-url" className="text-xs font-medium text-foreground">
                External Resource URL
              </Label>
              <Input
                id="web-url"
                type="url"
                placeholder="https://example.com/notes.pdf or https://github.com/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="text-xs"
              />
              <div className="flex items-center gap-2 pt-1">
                <Label htmlFor="file-type-select" className="text-xs text-muted-foreground shrink-0">
                  Type:
                </Label>
                <select
                  id="file-type-select"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="text-xs h-7 rounded border border-input bg-background px-2 py-0.5"
                >
                  <option value="link">Website Link</option>
                  <option value="pdf">Online PDF</option>
                  <option value="slides">Online Slides</option>
                  <option value="code">GitHub / Code</option>
                  <option value="doc">Online Doc</option>
                </select>
              </div>
            </div>
          )}

          {/* Optional Description */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-desc" className="text-xs font-medium text-muted-foreground">
              Description (Optional)
            </Label>
            <Textarea
              id="resource-desc"
              name="description"
              rows={2}
              placeholder="Brief context or instructions for students..."
              className="text-xs resize-none"
            />
          </div>

          {state?.message && !state.success && (
            <p className="text-xs font-medium text-destructive">{state.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isPending ? "Publishing..." : "Publish Resource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
