"use client";

import * as React from "react";
import { useUploadThing } from "@/utils/uploadthing";
import { cn } from "@/lib/utils";
import { Upload, Loader2, FileUp } from "lucide-react";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";

type DropzoneProps = {
  endpoint?: "courseMaterial" | "assignmentSubmission" | "noticeAttachment";
  onUploadComplete?: (res: { url: string; key: string; name: string; size: number }[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function Dropzone({
  endpoint = "courseMaterial",
  onUploadComplete,
  onUploadError,
  className,
  disabled = false,
  readOnly = false,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      setProgress(0);
      if (res && onUploadComplete) {
        onUploadComplete(
          res.map((file) => ({
            url: file.url,
            key: file.key,
            name: file.name,
            size: file.size,
          }))
        );
      }
    },
    onUploadError: (error: Error) => {
      setProgress(0);
      onUploadError?.(error);
    },
    onUploadProgress: (p) => {
      setProgress(p);
    },
  });

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      if (readOnly || disabled) return;
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;
      setProgress(1);
      await startUpload(fileArray);
    },
    [startUpload, readOnly, disabled]
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!readOnly && !disabled) setIsDragOver(true);
    },
    [readOnly, disabled]
  );

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (readOnly || disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles, readOnly, disabled]
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files);
        // reset so same file can be selected again
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const handleClick = React.useCallback(() => {
    if (readOnly || disabled || isUploading) return;
    inputRef.current?.click();
  }, [readOnly, disabled, isUploading]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !readOnly && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [readOnly, disabled]
  );

  return (
    <div
      data-testid="dropzone"
      role="button"
      tabIndex={readOnly || disabled ? -1 : 0}
      aria-label={readOnly ? "File dropzone (read-only)" : "File dropzone, drag and drop or click to upload"}
      aria-disabled={readOnly || disabled}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 px-6 py-8 text-center transition-colors",
        !readOnly && !disabled && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
        isDragOver && !readOnly && !disabled && "border-primary bg-primary/5",
        (readOnly || disabled) && "opacity-60 cursor-not-allowed",
        isUploading && "pointer-events-none",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleInputChange}
        disabled={readOnly || disabled || isUploading}
        aria-hidden="true"
        tabIndex={-1}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Uploading...</p>
          <Progress value={progress} className="w-full">
            <ProgressTrack>
              <ProgressIndicator style={{ width: `${progress}%` }} />
            </ProgressTrack>
          </Progress>
          <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-full border bg-background",
              isDragOver ? "border-primary text-primary" : "border-border text-muted-foreground"
            )}
          >
            {isDragOver ? <FileUp className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {isDragOver ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {readOnly ? "Upload disabled in read-only mode" : "or click to browse (max 16MB)"}
          </p>
          {!readOnly && (
            <p className="mt-1 text-xs text-muted-foreground">PDF, images, text supported</p>
          )}
        </>
      )}
    </div>
  );
}

export default Dropzone;
