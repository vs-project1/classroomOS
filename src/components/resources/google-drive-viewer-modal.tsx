"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Presentation, X, BookOpen } from "lucide-react";
import { parseGoogleDriveUrl } from "@/lib/google-drive";
import { Button } from "@/components/ui/button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  subjectName?: string;
  chapterTitle?: string | null;
};

export function GoogleDriveViewerModal({
  isOpen,
  onClose,
  title,
  url,
  subjectName,
  chapterTitle,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setIsFullscreen(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !url) return null;

  const driveInfo = parseGoogleDriveUrl(url);
  const embedUrl = driveInfo.embedUrl ?? (
    url.endsWith(".pdf") || url.includes("uploadthing.com")
      ? `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
      : url
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`relative flex flex-col bg-background border border-border rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? "w-full h-full rounded-none border-0"
            : "w-full max-w-5xl h-[88vh] max-h-[850px]"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
              <Presentation className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
                {title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                {subjectName && <span className="font-medium text-foreground/80">{subjectName}</span>}
                {subjectName && chapterTitle && <span>•</span>}
                {chapterTitle && <span>Chapter: {chapterTitle}</span>}
                {driveInfo.isGoogleDrive && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Google Slides
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Open in new tab / Google Drive"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open Original</span>
            </a>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Embedded Iframe Content */}
        <div className="relative flex-1 bg-black/90 w-full h-full overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            allow="fullscreen"
            allowFullScreen
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
