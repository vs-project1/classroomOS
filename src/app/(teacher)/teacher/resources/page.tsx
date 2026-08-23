import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { resources, subjects, courseUnits, courseChapters } from "@/db/schema";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceForm } from "@/features/resources/components/resource-form";
import { FileText, Link as LinkIcon, Download, BookOpen, Layers, UploadCloud } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dropzone } from "@/components/files/dropzone";
import { FilePreview } from "@/components/files/file-preview";

export default async function ResourcesPage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (!user.teacherId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
          Your account is not linked to a teacher profile.
        </div>
      </div>
    );
  }

  // Fetch subjects assigned to this teacher
  const assignedSubjects = await db
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .where(eq(subjects.teacherId, user.teacherId));

  // Fetch resources uploaded by this teacher
  const teacherResources = await db
    .select({
      resource: resources,
      subject: subjects
    })
    .from(resources)
    .innerJoin(subjects, eq(subjects.id, resources.subjectId))
    .where(eq(resources.uploadedBy, user.teacherId))
    .orderBy(desc(resources.createdAt));

  // Course hierarchy: Units → Chapters → resources/courseMaterials
  // Used for the Units→Chapters accordion browser
  const subjectIds = assignedSubjects.map((s) => s.id);
  const teacherUnits = subjectIds.length > 0
    ? await db.query.courseUnits.findMany({
        where: inArray(courseUnits.subjectId, subjectIds),
        orderBy: [asc(courseUnits.order)],
        with: {
          courseChapters: {
            orderBy: [asc(courseChapters.order)],
            with: {
              courseMaterials: true,
              resources: true,
            },
          },
        },
      })
    : [];

  // Group units by subject for rendering
  const unitsBySubject = new Map<string, typeof teacherUnits>();
  for (const unit of teacherUnits) {
    const arr = unitsBySubject.get(unit.subjectId) ?? [];
    arr.push(unit);
    unitsBySubject.set(unit.subjectId, arr);
  }

  // Collect general (chapter-less) resources for preview
  const generalResources = teacherResources.filter(({ resource }) => !resource.chapterId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="text-muted-foreground">Manage and upload study materials for your classes.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Upload Resource</CardTitle>
            <CardDescription>Share a new file or link with your students.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assignedSubjects.length > 0 ? (
              <>
                <ResourceForm subjects={assignedSubjects} />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" /> Quick Dropzone
                  </p>
                  <Dropzone endpoint="courseMaterial" />
                  <p className="text-xs text-muted-foreground">UploadThing dropzone with progress & drag-drop. Files appear in your chapter browser after saving via the form above.</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You must be assigned to at least one subject to upload resources.</p>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          {/* Flat list: Your Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Your Resources</CardTitle>
              <CardDescription>Materials you have shared.</CardDescription>
            </CardHeader>
            <CardContent>
              {teacherResources.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20 border-dashed">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No resources uploaded yet.</p>
                  <p className="text-xs mt-1">Use the upload form or dropzone to add your first file — it will appear grouped by Units → Chapters below.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherResources.map(({ resource, subject }) => (
                    <div key={resource.id} className="flex flex-col gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg shrink-0 mt-1">
                            {resource.fileType === "link" ? (
                              <LinkIcon className="w-5 h-5 text-primary" />
                            ) : (
                              <FileText className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{resource.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {subject.name} • {resource.fileType.toUpperCase()}
                            </p>
                            {resource.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{resource.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0">
                          <Link
                            href={resource.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {resource.fileType === "link" ? "Visit" : "View"}
                          </Link>
                        </div>
                      </div>
                      <FilePreview fileUrl={resource.fileUrl} fileType={resource.fileType} title={resource.title} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Units → Chapters accordion browser */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" /> Course Browser
              </CardTitle>
              <CardDescription>
                Units → Chapters accordion with grouped materials. Uses relations courseUnits → courseChapters → resources / courseMaterials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedSubjects.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                  No subjects assigned — ask admin to assign subjects to enable the course browser.
                </div>
              ) : teacherUnits.length === 0 ? (
                <div className="space-y-4">
                  <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg border-dashed">
                    No units or chapters yet. Create syllabus structure to organize resources by chapter.
                  </div>
                  {generalResources.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary" /> General (Unchaptered)
                      </h4>
                      <div className="space-y-2">
                        {generalResources.map(({ resource }) => (
                          <div key={resource.id} className="p-3 rounded-lg border bg-muted/20">
                            <p className="text-sm font-medium">{resource.title}</p>
                            <p className="text-xs text-muted-foreground">{resource.fileType} • {resource.fileUrl.slice(0, 48)}</p>
                            <div className="mt-2">
                              <FilePreview fileUrl={resource.fileUrl} fileType={resource.fileType} title={resource.title} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Dropzone preview (interactive upload)</p>
                    <Dropzone endpoint="courseMaterial" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {assignedSubjects.map((subject) => {
                    const subjectUnits = unitsBySubject.get(subject.id) ?? [];
                    if (subjectUnits.length === 0) {
                      return (
                        <div key={subject.id} className="space-y-2">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" /> {subject.name}
                          </h3>
                          <p className="text-xs text-muted-foreground border rounded-lg border-dashed p-4 text-center">No units for this subject yet.</p>
                        </div>
                      );
                    }
                    return (
                      <div key={subject.id} className="space-y-3">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" /> {subject.name}
                        </h3>
                        <Accordion className="rounded-lg border bg-card divide-y">
                          {subjectUnits.map((unit) => (
                            <AccordionItem key={unit.id} value={unit.id} className="px-3">
                              <AccordionTrigger className="hover:no-underline py-3">
                                <span className="flex items-center gap-2 text-left">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                                    {unit.order}
                                  </span>
                                  <span className="font-semibold text-sm">{unit.title}</span>
                                  <span className="text-xs text-muted-foreground">({unit.courseChapters.length} chapters)</span>
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pb-3">
                                {unit.courseChapters.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">No chapters in this unit.</p>
                                ) : (
                                  <div className="space-y-4 pl-1">
                                    {unit.courseChapters.map((chapter) => {
                                      const chapterResources = chapter.resources ?? [];
                                      const chapterMaterials = chapter.courseMaterials ?? [];
                                      const combined = [
                                        ...chapterResources.map((r) => ({
                                          id: r.id,
                                          title: r.title,
                                          fileUrl: r.fileUrl,
                                          fileType: r.fileType,
                                          description: r.description,
                                        })),
                                        ...chapterMaterials.map((m) => ({
                                          id: m.id,
                                          title: m.title,
                                          fileUrl: m.fileUrl,
                                          fileType: m.fileType,
                                          description: null as string | null,
                                        })),
                                      ];
                                      return (
                                        <div key={chapter.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                                              {chapter.title}
                                            </h4>
                                            <span className="text-xs text-muted-foreground">{combined.length} file{combined.length === 1 ? "" : "s"}</span>
                                          </div>
                                          {combined.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">No materials in this chapter yet.</p>
                                          ) : (
                                            <div className="space-y-2">
                                              {combined.map((item) => (
                                                <div key={item.id} className="space-y-1">
                                                  <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-medium truncate">{item.title}</span>
                                                    <span className="shrink-0 rounded bg-background border px-1.5 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">{item.fileType}</span>
                                                  </div>
                                                  <FilePreview fileUrl={item.fileUrl} fileType={item.fileType} title={item.title} />
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    );
                  })}
                  {/* General bucket if any */}
                  {generalResources.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <h4 className="text-sm font-semibold">General (Unchaptered)</h4>
                      <div className="space-y-2">
                        {generalResources.map(({ resource }) => (
                          <div key={resource.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{resource.title}</span>
                              <span className="text-xs text-muted-foreground">{resource.fileType}</span>
                            </div>
                            <FilePreview fileUrl={resource.fileUrl} fileType={resource.fileType} title={resource.title} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
