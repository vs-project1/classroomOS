import * as React from "react";
import { ExternalLink, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { FilePreview } from "@/components/files/file-preview";
import { AddResourceModal } from "@/features/resources/components/add-resource-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { fileTypeStyle, formatFileSize } from "./tab-utils";
import { cn } from "@/lib/utils";

export interface ResourceMaterialItem {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  groupLabel: string;
}

export interface ResourceUnitChapter {
  id: string;
  title: string;
  courseMaterials?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
  }>;
  resources?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    description?: string | null;
    fileSize?: number | null;
  }>;
}

export interface ResourceUnit {
  id: string;
  order: number;
  title: string;
  resources?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    description?: string | null;
    fileSize?: number | null;
  }>;
  courseChapters: ResourceUnitChapter[];
}

export interface SubjectResourceItem {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileType: string;
  fileSize?: number | null;
  unitId?: string | null;
  chapterId?: string | null;
  unit?: { id: string; title: string } | null;
  chapter?: { id: string; title: string } | null;
}

export interface ResourcesTabProps {
  units: ResourceUnit[];
  subjectResources: SubjectResourceItem[];
  allMaterials: ResourceMaterialItem[];
  subject: {
    id: string;
    name: string;
  };
  slug: string;
  isEditor: boolean;
  unitParam?: string;
}

export function ResourcesTab({
  units,
  subjectResources,
  allMaterials,
  subject,
  isEditor,
  unitParam,
}: ResourcesTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base text-foreground font-fira-sans">
              Learning Materials & Lecture Slides
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse by Units → Chapters. Uses relations courseUnits →
              courseChapters → resources / courseMaterials. Read-only.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {allMaterials.length} File{allMaterials.length === 1 ? "" : "s"}
          </span>
        </div>

        {units.length === 0 && allMaterials.length === 0 ? (
          <EmptyState
            className="py-12 max-w-full"
            description="Nothing here yet — study materials and lecture slides will appear once faculty uploads them."
          />
        ) : units.length === 0 ? (
          // Fallback flat grid when no syllabus units exist but legacy resources do
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMaterials.map((mat) => {
              const style = fileTypeStyle(mat.fileType);
              const Icon = style.icon;
              return (
                <div
                  key={mat.id}
                  className="p-4 rounded-xl border bg-card border-border/40 flex flex-col gap-3 hover:border-primary/50 hover:bg-muted/20 transition-all shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase border",
                        style.tint
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mat.fileType || "File"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border/60 truncate max-w-[55%]">
                      {mat.groupLabel}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground leading-snug">
                    {mat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {mat.description}
                  </p>
                  <FilePreview
                    fileUrl={mat.fileUrl}
                    fileType={mat.fileType}
                    title={mat.title}
                  />
                  <div className="flex items-center justify-between text-xs border-t border-border/30 pt-3">
                    <span className="text-muted-foreground font-medium">
                      {formatFileSize(mat.fileSize)}
                    </span>
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-7 text-xs gap-1 cursor-pointer",
                      })}
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Accordion
            defaultValue={unitParam ? [unitParam] : undefined}
            className="rounded-xl border divide-y bg-card"
          >
            {units.map((unit) => {
              const unitResources = subjectResources.filter(
                (r) =>
                  (r.unitId === unit.id || r.unit?.id === unit.id) &&
                  !r.chapterId
              );

              return (
                <AccordionItem key={unit.id} value={unit.id} className="px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="flex items-center gap-2 text-left">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {unit.order}
                      </span>
                      <span className="font-semibold text-sm">
                        {unit.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({unit.courseChapters.length} chapter
                        {unit.courseChapters.length === 1 ? "" : "s"}
                        {unitResources.length > 0
                          ? ` • ${unitResources.length} unit file${unitResources.length === 1 ? "" : "s"}`
                          : ""}
                        )
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {/* Unit Resources Shelf (Direct Unit Materials & Master Slides) */}
                    {unitResources.length > 0 && (
                      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                              📦 Unit Resources &amp; Master Slides
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[11px] h-5 bg-primary/15 text-primary border-primary/25 font-bold"
                            >
                              {unitResources.length}
                            </Badge>
                          </div>
                          {isEditor && (
                            <AddResourceModal
                              subjectId={subject.id}
                              subjectName={subject.name}
                              unitId={unit.id}
                              unitTitle={unit.title}
                              targetLabel={`Unit: ${unit.title}`}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-primary hover:text-primary gap-1 px-2 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Add Resource
                                </Button>
                              }
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {unitResources.map((item) => {
                            const style = fileTypeStyle(item.fileType);
                            const Icon = style.icon;
                            return (
                              <div
                                key={item.id}
                                className="rounded-lg border bg-card p-3 space-y-2 shadow-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border",
                                      style.tint
                                    )}
                                  >
                                    <Icon className="w-3 h-3" />{" "}
                                    {item.fileType || "File"}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    {formatFileSize(item.fileSize ?? null)}
                                  </span>
                                </div>
                                <h5 className="font-semibold text-xs text-foreground line-clamp-1">
                                  {item.title}
                                </h5>
                                {item.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                <FilePreview
                                  fileUrl={item.fileUrl}
                                  fileType={item.fileType}
                                  title={item.title}
                                />
                                <div className="flex justify-end pt-1">
                                  <a
                                    href={item.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={buttonVariants({
                                      variant: "outline",
                                      size: "sm",
                                      className:
                                        "h-6 text-xs gap-1 cursor-pointer",
                                    })}
                                  >
                                    <ExternalLink className="w-3 h-3" /> Open
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {unit.courseChapters.length === 0 ? (
                      unitResources.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No chapters or unit materials in this unit yet.
                        </p>
                      ) : null
                    ) : (
                      <div className="space-y-4">
                        {unit.courseChapters.map((chapter) => {
                          const chapterResources = subjectResources.filter(
                            (r) => r.chapterId === chapter.id
                          );
                          const chapterMaterials =
                            chapter.courseMaterials ?? [];
                          const combined = [
                            ...chapterResources.map((r) => ({
                              id: r.id,
                              title: r.title,
                              fileUrl: r.fileUrl,
                              fileType: r.fileType,
                              description: r.description,
                              fileSize: r.fileSize,
                            })),
                            ...chapterMaterials.map((m) => ({
                              id: m.id,
                              title: m.title,
                              fileUrl: m.fileUrl,
                              fileType: m.fileType,
                              description:
                                `Chapter resource: ${chapter.title}` as
                                  | string
                                  | null,
                              fileSize: null as number | null,
                            })),
                          ];
                          return (
                            <div
                              key={chapter.id}
                              className="rounded-lg border bg-muted/20 p-3 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">
                                  {chapter.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {combined.length} file
                                    {combined.length === 1 ? "" : "s"}
                                  </span>
                                  {isEditor && (
                                    <AddResourceModal
                                      subjectId={subject.id}
                                      subjectName={subject.name}
                                      unitId={unit.id}
                                      unitTitle={unit.title}
                                      chapterId={chapter.id}
                                      chapterTitle={chapter.title}
                                      targetLabel={`Chapter: ${chapter.title}`}
                                      trigger={
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 text-[11px] px-2 gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3 text-primary" />{" "}
                                          Add Resource
                                        </Button>
                                      }
                                    />
                                  )}
                                </div>
                              </div>
                              {combined.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">
                                  No materials in this chapter yet.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {combined.map((item) => {
                                    const style = fileTypeStyle(item.fileType);
                                    const Icon = style.icon;
                                    return (
                                      <div
                                        key={item.id}
                                        className="rounded-lg border bg-card p-3 space-y-2 shadow-sm"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span
                                            className={cn(
                                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase border",
                                              style.tint
                                            )}
                                          >
                                            <Icon className="w-3.5 h-3.5" />
                                            {item.fileType || "File"}
                                          </span>
                                          <span className="text-xs text-muted-foreground font-medium">
                                            {formatFileSize(
                                              item.fileSize ?? null
                                            )}
                                          </span>
                                        </div>
                                        <h5 className="font-semibold text-sm text-foreground leading-snug">
                                          {item.title}
                                        </h5>
                                        {item.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.description}
                                          </p>
                                        )}
                                        <FilePreview
                                          fileUrl={item.fileUrl}
                                          fileType={item.fileType}
                                          title={item.title}
                                        />
                                        <div className="flex justify-end">
                                          <a
                                            href={item.fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={buttonVariants({
                                              variant: "outline",
                                              size: "sm",
                                              className:
                                                "h-7 text-xs gap-1 cursor-pointer",
                                            })}
                                          >
                                            <ExternalLink className="w-3 h-3" />{" "}
                                            Open
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* General bucket — resources without chapter and without unit */}
        {(() => {
          const general = subjectResources.filter(
            (r) => !r.chapterId && !r.unitId && !r.unit?.id
          );
          if (general.length === 0) return null;
          return (
            <div className="mt-6 space-y-3 border-t pt-6">
              <h3 className="font-semibold text-sm">
                General (Subject-wide Materials)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {general.map((r) => {
                  const style = fileTypeStyle(r.fileType);
                  const Icon = style.icon;
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border bg-card p-4 space-y-2 shadow-sm"
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase border",
                          style.tint
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" /> {r.fileType}
                      </span>
                      <h4 className="font-semibold text-sm">{r.title}</h4>
                      <FilePreview
                        fileUrl={r.fileUrl}
                        fileType={r.fileType}
                        title={r.title}
                      />
                      <div className="flex justify-end pt-1">
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "h-7 text-xs gap-1 cursor-pointer",
                          })}
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
