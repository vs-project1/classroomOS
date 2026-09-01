"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileArchive,
  FileCode,
  FileText,
  Filter,
  FolderDown,
  Presentation,
  Search,
  File as GenericFileIcon,
} from "lucide-react";
import type { ResourceWithDetails } from "@/features/resources/queries";
import { GoogleDriveViewerModal } from "@/components/resources/google-drive-viewer-modal";
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
  if (!bytes || bytes === 0) return "N/A";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  initialResources: ResourceWithDetails[];
  availableSubjects: { id: string; name: string; code: string }[];
};

export function ResourcesClient({ initialResources, availableSubjects }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [activeViewerResource, setActiveViewerResource] = useState<ResourceWithDetails | null>(null);

  const filteredResources = useMemo(() => {
    return initialResources.filter((res) => {
      const matchesSubject =
        selectedSubject === "ALL" || res.subjectId === selectedSubject;
      const matchesType =
        selectedType === "ALL" || res.fileType?.toLowerCase() === selectedType.toLowerCase();

      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        res.title.toLowerCase().includes(searchLower) ||
        (res.description && res.description.toLowerCase().includes(searchLower)) ||
        res.subjectName.toLowerCase().includes(searchLower) ||
        (res.chapterTitle && res.chapterTitle.toLowerCase().includes(searchLower)) ||
        (res.teacherName && res.teacherName.toLowerCase().includes(searchLower));

      return matchesSubject && matchesType && matchesSearch;
    });
  }, [initialResources, selectedSubject, selectedType, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes, PPTs, topics, or teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All Subjects ({availableSubjects.length})</option>
              {availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[110px]"
          >
            <option value="ALL">All Formats</option>
            <option value="pdf">PDF Files</option>
            <option value="slides">PPT / Slides</option>
            <option value="doc">Documents</option>
            <option value="code">Code Snippets</option>
            <option value="zip">Zip Archives</option>
            <option value="link">Web Links</option>
          </select>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredResources.length}</span> study material{filteredResources.length === 1 ? "" : "s"}
        </p>
        {(searchTerm || selectedSubject !== "ALL" || selectedType !== "ALL") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedSubject("ALL");
              setSelectedType("ALL");
            }}
            className="text-xs text-primary hover:underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Resources Table / List */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-border/60 p-8">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3 stroke-[1.5]" />
          <h3 className="text-base font-semibold text-foreground mb-1">No materials found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            No resources match your active search or filter selection. Try resetting your search terms.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedSubject("ALL");
              setSelectedType("ALL");
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-xs transition-all"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 shrink-0 mt-0.5 sm:mt-0">
                  {getFileTypeIcon(res.fileType)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm text-foreground tracking-tight hover:text-primary transition-colors">
                      {res.title}
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      {res.subjectName} ({res.subjectCode})
                    </span>
                    {isGoogleDriveUrl(res.fileUrl) ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Presentation className="h-3 w-3" /> Google Slides
                      </span>
                    ) : res.fileType ? (
                      <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {res.fileType}
                      </span>
                    ) : null}
                  </div>

                  {res.description && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-2">
                      {res.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                    {res.chapterTitle && (
                      <span className="font-medium text-foreground/80">
                        Chapter: {res.chapterTitle}
                      </span>
                    )}
                    {res.teacherName && <span>Uploaded by: {res.teacherName}</span>}
                    {res.createdAt && <span>Added: {formatDate(res.createdAt)}</span>}
                    {res.fileSize && <span>Size: {formatBytes(res.fileSize)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 w-full sm:w-auto justify-end">
                {(isGoogleDriveUrl(res.fileUrl) || res.fileType === "slides" || res.fileUrl.endsWith(".pdf")) && (
                  <button
                    type="button"
                    onClick={() => setActiveViewerResource(res)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-2xs w-full sm:w-auto cursor-pointer"
                  >
                    <Presentation className="h-3.5 w-3.5" />
                    <span>View Slides</span>
                  </button>
                )}

                <a
                  href={res.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors shadow-2xs w-full sm:w-auto"
                  title="Open in new tab / Google Drive"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Link</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embedded Presentation Viewer Modal */}
      <GoogleDriveViewerModal
        isOpen={Boolean(activeViewerResource)}
        onClose={() => setActiveViewerResource(null)}
        title={activeViewerResource?.title ?? ""}
        url={activeViewerResource?.fileUrl ?? ""}
        subjectName={activeViewerResource?.subjectName}
        chapterTitle={activeViewerResource?.chapterTitle}
      />
    </div>
  );
}
