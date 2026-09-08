"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, UploadCloud, Layers, FileText, Trash2 } from "lucide-react";
import { ResourceForm } from "@/features/resources/components/resource-form";
import { FilePreview } from "@/components/files/file-preview";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { deleteResourceAction } from "@/features/resources/actions/resources";

export type ResourceWorkspaceSubject = {
  id: string;
  name: string;
  code: string;
  courseUnits: {
    id: string;
    title: string;
    order: number;
    courseChapters: {
      id: string;
      title: string;
      order: number;
      resources: {
        id: string;
        title: string;
        fileUrl: string;
        fileType: string;
      }[];
    }[];
  }[];
};

export type ResourceWorkspaceItem = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  createdAt: Date;
  subject?: { name: string } | null;
  chapter?: { title: string } | null;
};

type Props = {
  title: string;
  subtitle: string;
  subjects: ResourceWorkspaceSubject[];
  resourcesList: ResourceWorkspaceItem[];
  canDelete?: boolean;
};

export function ResourcesWorkspace({
  title,
  subtitle,
  subjects,
  resourcesList,
  canDelete = true,
}: Props) {
  const [isDeleting, startDelete] = useTransition();

  const handleDelete = (resourceId: string, resourceTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${resourceTitle}"?`)) return;

    startDelete(async () => {
      const res = await deleteResourceAction(resourceId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  const formSubjects = subjects.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
            <div className="bg-primary/5 p-6 border-b border-border/40 flex flex-col gap-2">
              <UploadCloud className="w-8 h-8 text-primary" />
              <CardTitle className="text-xl">Upload Material</CardTitle>
              <CardDescription>Share files with your students</CardDescription>
            </div>
            <CardContent className="p-6">
              {formSubjects.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No subjects available. Add subjects before uploading materials.
                </div>
              ) : (
                <ResourceForm subjects={formSubjects} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="structured" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-xl p-1 bg-muted/50 border border-border/50">
                <TabsTrigger value="structured" className="rounded-lg">
                  Structured View
                </TabsTrigger>
                <TabsTrigger value="list" className="rounded-lg">
                  All Files ({resourcesList.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="structured" className="space-y-6 mt-0">
              <Card className="rounded-3xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  {subjects.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No subjects found.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="space-y-4">
                          <h3 className="font-fira-sans text-xl font-bold text-foreground flex items-center gap-2">
                            <span className="inline-flex h-6 items-center rounded-full bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                              {subject.code}
                            </span>
                            {subject.name}
                          </h3>

                          {subject.courseUnits.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-xl border border-dashed">
                              No units configured for this subject.
                            </p>
                          ) : (
                            <Accordion className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                              {subject.courseUnits.map((unit) => {
                                const totalFilesInUnit = unit.courseChapters.reduce(
                                  (sum, ch) => sum + ch.resources.length,
                                  0
                                );

                                return (
                                  <AccordionItem key={unit.id} value={unit.id} className="border-b-0 px-4">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                      <span className="flex items-center gap-3 text-left">
                                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                                          {unit.order}
                                        </span>
                                        <span className="font-semibold text-sm">{unit.title}</span>
                                        <span className="text-xs text-muted-foreground ml-auto pr-2">
                                          {totalFilesInUnit} {totalFilesInUnit === 1 ? "file" : "files"}
                                        </span>
                                      </span>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4">
                                      {unit.courseChapters.length === 0 ? (
                                        <div className="pl-10 pr-2 py-3 text-xs text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">
                                          No sub-chapters yet. Upload resources using this unit from the upload form.
                                        </div>
                                      ) : (
                                        <div className="space-y-3 pl-10 pr-2">
                                          {unit.courseChapters.map((chapter) => (
                                            <div
                                              key={chapter.id}
                                              className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3"
                                            >
                                              <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                                  <Layers className="w-4 h-4 text-muted-foreground" />
                                                  {chapter.title}
                                                </h4>
                                                <span className="text-xs font-medium px-2 py-1 bg-background rounded-md text-muted-foreground border">
                                                  {chapter.resources.length} files
                                                </span>
                                              </div>

                                              {chapter.resources.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic pt-1">
                                                  No materials uploaded.
                                                </p>
                                              ) : (
                                                <div className="space-y-2 pt-2 border-t border-border/40">
                                                  {chapter.resources.map((item) => (
                                                    <div
                                                      key={item.id}
                                                      className="bg-background rounded-lg border border-border/40 p-2.5 space-y-2"
                                                    >
                                                      <div className="flex items-center justify-between gap-2 px-1">
                                                        <span className="text-xs font-medium truncate">
                                                          {item.title}
                                                        </span>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                                                            {item.fileType}
                                                          </span>
                                                          {canDelete && (
                                                            <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon"
                                                              disabled={isDeleting}
                                                              onClick={() => handleDelete(item.id, item.title)}
                                                              className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                                              title="Delete resource"
                                                            >
                                                              <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <FilePreview
                                                        fileUrl={item.fileUrl}
                                                        fileType={item.fileType}
                                                        title={item.title}
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="mt-0">
              <Card className="rounded-3xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  {resourcesList.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <p>No files uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {resourcesList.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex flex-col rounded-xl border border-border/40 bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="pr-2">
                              <h4 className="font-semibold text-sm line-clamp-1">{resource.title}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {resource.subject?.name || "General"}
                                {resource.chapter ? ` • ${resource.chapter.title}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="shrink-0 rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                                {resource.fileType}
                              </span>
                              {canDelete && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(resource.id, resource.title)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                                  title="Delete resource"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-auto pt-3 border-t border-border/40">
                            <FilePreview
                              fileUrl={resource.fileUrl}
                              fileType={resource.fileType}
                              title={resource.title}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
