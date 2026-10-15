"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  FileText,
  Presentation,
  Table,
  Folder,
  File,
  Download,
  Info,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  validateGoogleDriveUrl,
  toGoogleDrivePreviewUrl,
  type GoogleDriveSubmissionType,
} from "@/features/assignments/utils/drive";

interface DriveSubmissionPreviewProps {
  fileUrl: string;
  fileName?: string | null;
  title?: string | null;
  className?: string;
}

function getDriveTypeConfig(type?: GoogleDriveSubmissionType) {
  switch (type) {
    case "doc":
      return {
        label: "Google Doc",
        badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        icon: FileText,
      };
    case "sheet":
      return {
        label: "Google Sheet",
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        icon: Table,
      };
    case "slide":
      return {
        label: "Google Slides",
        badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        icon: Presentation,
      };
    case "folder":
      return {
        label: "Google Drive Folder",
        badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        icon: Folder,
      };
    case "file":
    default:
      return {
        label: "Google Drive File",
        badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        icon: File,
      };
  }
}

/**
 * Canvas LMS-style SpeedGrader embedded submission preview.
 * Displays Google Drive / Docs / Sheets / Slides in an interactive inline iframe
 * with dedicated header and direct fallback navigation link.
 */
export function DriveSubmissionPreview({
  fileUrl,
  fileName,
  title,
  className,
}: DriveSubmissionPreviewProps) {
  const [iframeError, setIframeError] = React.useState(false);
  const driveInfo = validateGoogleDriveUrl(fileUrl);
  const isDrive = driveInfo.isValid;
  const previewUrl = isDrive ? toGoogleDrivePreviewUrl(fileUrl) : fileUrl;
  const config = getDriveTypeConfig(driveInfo.type);
  const Icon = config.icon;

  if (isDrive) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all",
          className
        )}
      >
        {/* SpeedGrader-style Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-background border shadow-2xs">
              <Icon className="h-4 w-4 text-primary shrink-0" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-xs font-semibold text-foreground">
                {title ?? fileName ?? config.label}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {fileUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                config.badgeColor
              )}
            >
              {config.label}
            </span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 text-xs font-medium gap-1.5 cursor-pointer shadow-2xs"
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in Google Drive</span>
            </a>
          </div>
        </div>

        {/* Canvas LMS SpeedGrader Embedded Iframe */}
        <div className="relative w-full h-[520px] sm:h-[600px] md:h-[680px] bg-muted/20">
          <iframe
            src={previewUrl}
            title={title ?? fileName ?? "Submission document preview"}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
            onError={() => setIframeError(true)}
          />

          {iframeError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background/95">
              <Info className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">
                Preview could not be embedded directly
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-4">
                Google account sign-in or organization permissions may prevent embedding in an iframe.
              </p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in Google Drive
              </a>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Info className="h-3 w-3 text-muted-foreground/80 shrink-0" />
            <span>
              If document does not load, ensure permissions are set to &quot;Anyone with the link can view&quot;.
            </span>
          </span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium shrink-0 ml-2"
          >
            Direct Link ↗
          </a>
        </div>
      </div>
    );
  }

  // Standard non-Drive attachment display
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-2xs",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {fileName ?? "Submitted Attachment"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{fileUrl}</p>
        </div>
      </div>

      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 text-xs font-medium gap-1.5 shrink-0"
        )}
      >
        <Download className="h-3.5 w-3.5" />
        <span>Open / Download</span>
      </a>
    </div>
  );
}
