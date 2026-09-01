"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FileText, ExternalLink, Play, ImageIcon, Presentation } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { parseGoogleDriveUrl, isGoogleDriveUrl } from "@/lib/google-drive";

type FilePreviewProps = {
  fileUrl: string;
  fileType: string;
  title?: string;
  fileName?: string;
  className?: string;
};

const IMAGE_TYPES = new Set(["image", "png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "svg"]);
const VIDEO_TYPES = new Set(["video", "mp4", "webm", "mov", "avi", "mkv"]);
const PDF_TYPES = new Set(["pdf"]);

function isImageType(fileType: string): boolean {
  return IMAGE_TYPES.has(fileType.trim().toLowerCase());
}

function isVideoType(fileType: string): boolean {
  return VIDEO_TYPES.has(fileType.trim().toLowerCase());
}

function isPdfType(fileType: string): boolean {
  return PDF_TYPES.has(fileType.trim().toLowerCase());
}

function isLinkType(fileType: string): boolean {
  return fileType.trim().toLowerCase() === "link";
}

export function FilePreview({ fileUrl, fileType, title, fileName, className }: FilePreviewProps) {
  const normalizedType = (fileType || "").trim().toLowerCase();
  const driveInfo = parseGoogleDriveUrl(fileUrl);
  if (driveInfo.isGoogleDrive || normalizedType === "slides" || normalizedType === "ppt") {
    const embedUrl = driveInfo.embedUrl ?? (
      fileUrl.endsWith(".pdf")
        ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
        : fileUrl
    );

    return (
      <div className={cn("overflow-hidden rounded-xl border bg-card shadow-2xs", className)}>
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Presentation className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="truncate text-sm font-semibold text-foreground">
              {title ?? fileName ?? "Presentation Slides"}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
            Google Slides
          </span>
        </div>
        <div className="relative aspect-video w-full bg-black/90">
          <iframe
            src={embedUrl}
            title={title ?? "Google Slides preview"}
            className="w-full h-full border-0"
            allow="fullscreen"
            allowFullScreen
          />
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs border-t bg-card">
          <span className="truncate text-muted-foreground">{fileName ?? fileUrl}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" }))}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open Original
          </a>
        </div>
      </div>
    );
  }

  if (isLinkType(normalizedType)) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border bg-card p-4", className)}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
          <ExternalLink className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {fileUrl}
          </a>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ExternalLink className="h-4 w-4 mr-2" /> Visit
        </a>
      </div>
    );
  }

  if (isImageType(normalizedType)) {
    return (
      <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
        {title && (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          </div>
        )}
        <div className="relative bg-muted/20">
          {/* Use next/image for optimized image; fallback to img if external URL not allowed */}
          <div className="relative aspect-video w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={title ?? fileName ?? "Image preview"}
              className="h-full w-full object-contain"
            />
          </div>
          {/* Next/image alternative when domain is configured: keep as comment for future */}
          {/* <Image src={fileUrl} alt={title ?? "Image preview"} fill className="object-contain" unoptimized /> */}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 text-xs">
          <span className="truncate text-muted-foreground">{fileName ?? fileUrl}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" }))}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open
          </a>
        </div>
      </div>
    );
  }

  if (isVideoType(normalizedType)) {
    return (
      <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
        {title && (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
            <Play className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          </div>
        )}
        <video
          src={fileUrl}
          controls
          preload="metadata"
          className="w-full bg-black"
          aria-label={title ?? "Video preview"}
        />
        <div className="flex items-center justify-between px-4 py-2.5 text-xs">
          <span className="truncate text-muted-foreground">{fileName ?? "Video file"}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" }))}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open
          </a>
        </div>
      </div>
    );
  }

  if (isPdfType(normalizedType)) {
    return (
      <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
        {title && (
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
            <FileText className="h-4 w-4 text-red-500" />
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          </div>
        )}
        <div className="relative bg-muted/20">
          {/* PDF via iframe; PDF.js could be swapped in here for richer rendering */}
          <iframe
            src={fileUrl}
            title={title ?? "PDF preview"}
            className="h-[480px] w-full border-0"
            loading="lazy"
          />
          {/* PDF.js stub: replace iframe with <canvas> renderer when PDF.js is introduced */}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 text-xs border-t">
          <span className="truncate text-muted-foreground">{fileName ?? "PDF document"}</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm", className: "h-7 text-xs" }))}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open in new tab
          </a>
        </div>
      </div>
    );
  }

  // Fallback: generic file card with link
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card p-4", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        {title && <p className="truncate text-sm font-semibold text-foreground">{title}</p>}
        <p className="truncate text-xs text-muted-foreground">{fileName ?? fileUrl}</p>
        <span className="inline-flex mt-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-bold uppercase text-muted-foreground border">
          {normalizedType || "file"}
        </span>
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <ExternalLink className="h-4 w-4 mr-2" /> Open
      </a>
    </div>
  );
}

export default FilePreview;
