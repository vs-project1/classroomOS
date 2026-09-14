import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, FileCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChapterCoverageToggle } from "@/features/subjects/components/chapter-coverage-toggle";
import { AddResourceModal } from "@/features/resources/components/add-resource-modal";
import { AddChapterDialog } from "@/features/subjects/components/add-chapter-dialog";
import { cn } from "@/lib/utils";

export interface SyllabusUnitChapter {
  id: string;
  order: number;
  title: string;
  coveredAt: Date | string | null;
  courseMaterials?: Array<{ id: string }>;
  resources?: Array<{ id: string }>;
}

export interface SyllabusUnit {
  id: string;
  order: number;
  title: string;
  resources?: Array<{ id: string }>;
  courseChapters: SyllabusUnitChapter[];
}

export interface SyllabusTabProps {
  units: SyllabusUnit[];
  coveredChapters: number;
  totalChapters: number;
  subject: {
    id: string;
    name: string;
  };
  slug: string;
  isEditor: boolean;
  canToggleCoverage: boolean;
}

export function SyllabusTab({
  units,
  coveredChapters,
  totalChapters,
  subject,
  slug,
  isEditor,
  canToggleCoverage,
}: SyllabusTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-foreground font-fira-sans">
            Curriculum & Unit Breakdown
          </h2>
          <span className="text-sm text-foreground/80 font-bold">
            {coveredChapters}/{totalChapters} Chapters Covered
          </span>
        </div>

        {units.length > 0 ? (
          <div className="space-y-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="p-4 rounded-xl border bg-muted/20 border-border space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-primary font-mono font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      Unit {unit.order}
                    </span>
                    <h3 className="font-bold text-base text-foreground">
                      {unit.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const unitResCount = unit.resources?.length ?? 0;
                      const chapResCount = unit.courseChapters.reduce(
                        (acc, c) =>
                          acc +
                          (c.courseMaterials?.length ?? 0) +
                          (c.resources?.length ?? 0),
                        0
                      );
                      const totalUnitMaterials = unitResCount + chapResCount;
                      if (totalUnitMaterials === 0) return null;
                      return (
                        <Link
                          href={`/subjects/${slug}?tab=resources&unit=${unit.id}`}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          {totalUnitMaterials} File
                          {totalUnitMaterials === 1 ? "" : "s"}
                        </Link>
                      );
                    })()}

                    {isEditor && (
                      <div className="flex items-center gap-1.5">
                        <AddResourceModal
                          subjectId={subject.id}
                          subjectName={subject.name}
                          unitId={unit.id}
                          unitTitle={unit.title}
                          targetLabel={`Unit: ${unit.title}`}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-primary" /> Add
                              Resource to Unit
                            </Button>
                          }
                        />
                        <AddChapterDialog
                          unitId={unit.id}
                          subjectId={subject.id}
                          unitTitle={unit.title}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {unit.courseChapters.length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2 border-primary">
                    {unit.courseChapters.map((chap) => {
                      const covered = Boolean(chap.coveredAt);
                      return (
                        <div
                          key={chap.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/40"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {covered ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                            )}
                            <span
                              className={cn(
                                "font-semibold truncate",
                                covered
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {chap.title}
                            </span>
                          </span>

                          <span className="flex items-center gap-2 mt-1 sm:mt-0 shrink-0">
                            {(() => {
                              const totalChapterMaterials =
                                (chap.courseMaterials?.length ?? 0) +
                                (chap.resources?.length ?? 0);
                              if (totalChapterMaterials === 0) return null;
                              return (
                                <Link
                                  href={`/subjects/${slug}?tab=resources&unit=${unit.id}`}
                                  className="text-primary font-bold text-xs flex items-center gap-1.5 hover:underline"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  {totalChapterMaterials} Material
                                  {totalChapterMaterials === 1 ? "" : "s"}{" "}
                                  Attached
                                </Link>
                              );
                            })()}
                            {isEditor && (
                              <AddResourceModal
                                subjectId={subject.id}
                                subjectName={subject.name}
                                unitId={unit.id}
                                unitTitle={unit.title}
                                chapterId={chap.id}
                                chapterTitle={chap.title}
                                targetLabel={`Chapter: ${chap.title}`}
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
                            {canToggleCoverage && (
                              <ChapterCoverageToggle
                                chapterId={chap.id}
                                covered={covered}
                              />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="py-12 max-w-full"
            description="Syllabus outline and chapter topics will be published by faculty soon."
          />
        )}
      </div>
    </div>
  );
}
