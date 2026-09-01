import Link from "next/link";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileArchive,
  FileCode,
  FileText,
  FolderDown,
  Presentation,
  File as GenericFileIcon,
} from "lucide-react";
import { getRecentStudentResources } from "../queries";
import { isGoogleDriveUrl } from "@/lib/google-drive";

function getFileTypeIcon(fileType: string) {
  switch (fileType?.toLowerCase()) {
    case "pdf":
      return <FileText className="h-5 w-5 text-rose-500 shrink-0" />;
    case "slides":
    case "ppt":
      return <Presentation className="h-5 w-5 text-amber-500 shrink-0" />;
    case "code":
      return <FileCode className="h-5 w-5 text-purple-500 shrink-0" />;
    case "zip":
      return <FileArchive className="h-5 w-5 text-indigo-500 shrink-0" />;
    case "link":
      return <ExternalLink className="h-5 w-5 text-blue-500 shrink-0" />;
    default:
      return <GenericFileIcon className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export async function RecentResourcesWidget({
  viewAllHref = "/resources",
  href,
}: {
  viewAllHref?: string;
  href?: string;
} = {}) {
  const targetHref = href || viewAllHref;
  const recentResources = await getRecentStudentResources(5);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-border">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderDown className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base tracking-tight">Study Materials</h3>
            <p className="text-xs text-muted-foreground">Recent notes & PPTs from your teachers</p>
          </div>
        </div>
        <Link
          href={targetHref}
          className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          View All <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {recentResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-2 stroke-[1.5]" />
          <p className="text-sm font-medium text-muted-foreground">No recent resources</p>
          <p className="text-xs text-muted-foreground/70 max-w-[240px]">
            Your teachers haven&apos;t uploaded any PPTs or notes for your subjects yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recentResources.map((res) => (
            <div
              key={res.id}
              className="group flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 hover:border-border/80 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="p-2 rounded-md bg-background border border-border/60 group-hover:scale-105 transition-transform">
                  {getFileTypeIcon(res.fileType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground truncate max-w-[220px] sm:max-w-[320px]">
                      {res.title}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary text-secondary-foreground">
                      {res.subjectCode || res.subjectName}
                    </span>
                    {isGoogleDriveUrl(res.fileUrl) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Google Slides
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {res.chapterTitle && (
                      <>
                        <span className="truncate max-w-[150px]">{res.chapterTitle}</span>
                        <span>&bull;</span>
                      </>
                    )}
                    {res.teacherName && (
                      <>
                        <span>{res.teacherName}</span>
                        <span>&bull;</span>
                      </>
                    )}
                    {res.fileSize && <span>{formatBytes(res.fileSize)}</span>}
                  </div>
                </div>
              </div>

              <a
                href={res.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-2xs"
                title={`Download/View ${res.title}`}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Get</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
