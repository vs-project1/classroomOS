"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { createResourceAction, getChapterTreeAction, type ChapterTreeNode } from "../actions/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, Link as LinkIcon, Presentation, CheckCircle2 } from "lucide-react";
import { uploadFiles } from "@/utils/uploadthing";
import { cn } from "@/lib/utils";
import { parseGoogleDriveUrl, isGoogleDriveUrl } from "@/lib/google-drive";

type UploadedFile = {
  url: string;
  key: string;
  name: string;
  size: number;
};

const EXT_TO_FILE_TYPE: Record<string, string> = {
  pdf: "pdf",
  doc: "doc", docx: "doc", rtf: "doc", odt: "doc",
  ppt: "slides", pptx: "slides", key: "slides",
  zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip",
  txt: "text", md: "text", csv: "text",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image", avif: "image",
  js: "code", ts: "code", jsx: "code", tsx: "code", py: "code", java: "code", c: "code",
  cpp: "code", cs: "code", go: "code", rs: "code", php: "code", rb: "code", json: "code",
  xml: "code", yml: "code", yaml: "code", html: "code", css: "code", sql: "code", sh: "code",
};

function detectFileType(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_FILE_TYPE[ext] ?? null;
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function ResourceForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(createResourceAction, null);

  const [mode, setMode] = useState<"gdrive" | "upload" | "link">("gdrive");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [fileType, setFileType] = useState("slides");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [chapterTreeError, setChapterTreeError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [units, setUnits] = useState<ChapterTreeNode[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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

  // Publish feedback toasts (inline banners remain for field-level context).
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Material published to students.");
    } else if (state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state]);

  // Load the units -> chapters tree whenever the selected subject changes.
  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      return;
    }
    let cancelled = false;
    setUnits([]);
    setChaptersLoading(true);
    setChapterTreeError("");

    getChapterTreeAction(subjectId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setUnits(result.units);
        } else {
          setChapterTreeError(result.message);
        }
      })
      .catch(() => {
        if (!cancelled) setChapterTreeError("Unable to load chapters");
      })
      .finally(() => {
        if (!cancelled) setChaptersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

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
      loading: "Uploading material…",
      success: (uploaded) => `${uploaded.name} ready — pick chapter and publish`,
      error: "Upload failed. Try again.",
    });
  };

  const fileUrlValue = mode === "upload" ? uploadedFile?.url ?? "" : "";
  const canSubmit =
    !isPending &&
    !isUploading &&
    (mode === "upload" ? Boolean(uploadedFile?.url) : Boolean(linkUrl.trim()));

  // Clear uploaded file and link URL after successful publish so form resets for next entry
  useEffect(() => {
    if (state?.success) {
      setUploadedFile(null);
      setLinkUrl("");
    }
  }, [state?.success]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && (
        <div className="p-3 bg-green-50 text-green-800 rounded-md border border-green-200 text-sm">
          {state.message}
        </div>
      )}

      {!state?.success && state?.message && (
        <div className="p-3 bg-red-50 text-red-800 rounded-md border border-red-200 text-sm">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Resource Title</Label>
        <Input id="title" name="title" required placeholder="e.g. Chapter 1 Slides" />
        {state?.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectId">Subject</Label>
        <select
          id="subjectId"
          name="subjectId"
          required
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled>Select a subject</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.subjectId && (
          <p className="text-sm text-destructive">{state.fieldErrors.subjectId}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="chapterId">Unit / Chapter Scope (Optional)</Label>
        <select id="chapterId" name="chapterId" defaultValue="" disabled={chaptersLoading || units.length === 0} className={selectClassName}>
          <option value="">🌐 General (Subject-wide)</option>
          {units.map((unit) => (
            <optgroup key={unit.id} label={`Unit ${unit.order}: ${unit.title}`}>
              <option value={`unit:${unit.id}`}>📦 Unit {unit.order}: Entire Unit</option>
              {unit.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  &nbsp;&nbsp;↳ 📑 {chapter.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {chaptersLoading && (
          <p className="text-xs text-muted-foreground">Loading units & chapters...</p>
        )}
        {!chaptersLoading && units.length === 0 && !chapterTreeError && (
          <p className="text-xs text-muted-foreground">No syllabus units yet — resource will be filed under General.</p>
        )}
        {chapterTreeError && (
          <p className="text-xs text-muted-foreground">{chapterTreeError}</p>
        )}
      </div>

      {/* Source toggle: Google Drive vs direct file upload vs generic URL */}
      <div className="space-y-2">
        <Label>Resource Source</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={mode === "gdrive" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("gdrive");
              setFileType("slides");
            }}
            className="text-xs"
          >
            <Presentation className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Google Drive
          </Button>
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("upload")}
            className="text-xs"
          >
            <Paperclip className="w-3.5 h-3.5 mr-1.5" /> Direct File
          </Button>
          <Button
            type="button"
            variant={mode === "link" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("link")}
            className="text-xs"
          >
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Web Link
          </Button>
        </div>
      </div>

      {mode === "gdrive" ? (
        <div className="space-y-2">
          <Label htmlFor="fileUrl">Google Drive / Google Slides Link</Label>
          <Input
            id="fileUrl"
            name="fileUrl"
            type="url"
            required
            value={linkUrl}
            onChange={(e) => handleLinkUrlChange(e.target.value)}
            placeholder="https://docs.google.com/presentation/d/... or drive.google.com/file/d/..."
          />
          {isGoogleDriveUrl(linkUrl) ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Google Drive Presentation detected — Ready for interactive slide viewer!</span>
            </div>
          ) : linkUrl ? (
            <p className="text-xs text-amber-600">
              Tip: Paste a Google Drive file or Google Slides link for instant in-app slide viewing.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Paste your Google Drive share link. Make sure access is set to "Anyone with the link can view".
            </p>
          )}
          {state?.fieldErrors?.fileUrl && (
            <p className="text-sm text-destructive">{state.fieldErrors.fileUrl}</p>
          )}
        </div>
      ) : mode === "upload" ? (
        <div className="space-y-2">
          <Label>File Upload</Label>
          <label className="flex flex-col items-center gap-3 border-dashed border-2 border-border rounded-lg bg-muted/30 py-6 outline-none transition-colors hover:border-primary/50 cursor-pointer">
            <span className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium">
              {isUploading ? "Uploading…" : "Choose File"}
            </span>
            <span className="text-muted-foreground text-xs">PDF, image, or text — up to 16MB</span>
            <input
              type="file"
              accept=".pdf,image/*,.txt,.md,.csv"
              className="hidden"
              disabled={isUploading}
              onChange={handleFileSelected}
            />
          </label>
          <input type="hidden" name="fileUrl" value={fileUrlValue} />
          <input type="hidden" name="fileKey" value={uploadedFile?.key ?? ""} />
          <input type="hidden" name="fileSize" value={uploadedFile?.size ?? ""} />
          {uploadedFile && (
            <p className="text-sm font-medium text-emerald-500">
              “{uploadedFile.name}” attached and ready to save!
            </p>
          )}
          {state?.fieldErrors?.fileUrl && (
            <p className="text-sm text-destructive">Please upload a file before saving.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="fileUrl">External Resource URL</Label>
          <Input
            id="fileUrl"
            name="fileUrl"
            type="url"
            required
            value={linkUrl}
            onChange={(e) => handleLinkUrlChange(e.target.value)}
            placeholder="https://..."
          />
          {isGoogleDriveUrl(linkUrl) && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Google Drive Presentation detected!</span>
            </div>
          )}
          {state?.fieldErrors?.fileUrl && (
            <p className="text-sm text-destructive">{state.fieldErrors.fileUrl}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fileType">Resource Type</Label>
        <select
          id="fileType"
          name="fileType"
          required
          value={fileType}
          onChange={(event) => setFileType(event.target.value)}
          className={cn(selectClassName)}
        >
          <option value="pdf">PDF Document</option>
          <option value="doc">Word Document</option>
          <option value="slides">Presentation Slides</option>
          <option value="zip">ZIP Archive</option>
          <option value="code">Source Code</option>
          <option value="image">Image</option>
          <option value="text">Text / Notes</option>
          <option value="link">External Link</option>
        </select>
        {state?.fieldErrors?.fileType && (
          <p className="text-sm text-destructive">{state.fieldErrors.fileType}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea id="description" name="description" placeholder="Brief description of the resource..." />
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
          </>
        ) : (
          mode === "upload"
            ? uploadedFile
              ? "Save Resource"
              : "Attach a file to continue"
            : "Add Resource"
        )}
      </Button>
    </form>
  );
}
