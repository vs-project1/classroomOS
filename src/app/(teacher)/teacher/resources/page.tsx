import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { resources, subjects } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderOpen, UploadCloud, Layers, BookOpen, FileText } from "lucide-react";
import { ResourceForm } from "@/features/resources/components/resource-form";
import { FilePreview } from "@/components/files/file-preview";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const dynamic = "force-dynamic";

export default async function TeacherResourcesPage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl font-bold font-fira-sans tracking-tight">Class Resources</h1>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile.
        </div>
      </div>
    );
  }

  const assignedSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, user.teacherId),
    with: {
      courseUnits: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          courseChapters: {
            orderBy: (chapters, { asc }) => [asc(chapters.order)],
            with: {
              resources: {
                where: eq(resources.uploadedBy, user.teacherId),
                orderBy: (resources, { desc }) => [desc(resources.createdAt)],
              }
            }
          }
        }
      },
    },
  });

  const myResources = await db.query.resources.findMany({
    where: eq(resources.uploadedBy, user.teacherId),
    with: {
      subject: true,
      chapter: true,
    },
    orderBy: [desc(resources.createdAt)],
  });

  const generalResources = myResources.filter(r => !r.chapterId);

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-1.5 pb-6 border-b border-border/40">
        <h1 className="text-3xl md:text-4xl font-bold font-fira-sans tracking-tight text-foreground">
          Class Resources
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          Upload and organize study materials, slides, and handouts for your subjects.
        </p>
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
              <ResourceForm subjects={assignedSubjects} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="structured" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-xl p-1 bg-muted/50 border border-border/50">
                <TabsTrigger value="structured" className="rounded-lg">Structured View</TabsTrigger>
                <TabsTrigger value="list" className="rounded-lg">All My Files</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="structured" className="space-y-6 mt-0">
              <Card className="rounded-3xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  {assignedSubjects.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>You have no assigned subjects.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {assignedSubjects.map((subject) => (
                        <div key={subject.id} className="space-y-4">
                          <h3 className="font-fira-sans text-xl font-bold text-foreground flex items-center gap-2">
                            <span className="inline-flex h-6 items-center rounded-full bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                              {subject.code}
                            </span>
                            {subject.name}
                          </h3>
                          
                          {subject.courseUnits.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-xl border border-dashed">No units configured for this subject.</p>
                          ) : (
                            <Accordion className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                              {subject.courseUnits.map((unit) => (
                                <AccordionItem key={unit.id} value={unit.id} className="border-b-0 px-4">
                                  <AccordionTrigger className="hover:no-underline py-4">
                                    <span className="flex items-center gap-3 text-left">
                                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                                        {unit.order}
                                      </span>
                                      <span className="font-semibold text-sm">{unit.title}</span>
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-4">
                                    <div className="space-y-3 pl-10 pr-2">
                                      {unit.courseChapters.map((chapter) => (
                                        <div key={chapter.id} className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
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
                                            <p className="text-xs text-muted-foreground italic pt-1">No materials uploaded.</p>
                                          ) : (
                                            <div className="space-y-2 pt-2 border-t border-border/40">
                                              {chapter.resources.map((item) => (
                                                <div key={item.id} className="bg-background rounded-lg border border-border/40 p-2">
                                                  <div className="flex items-center justify-between gap-2 mb-2 px-1">
                                                    <span className="text-xs font-medium truncate">{item.title}</span>
                                                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                                                      {item.fileType}
                                                    </span>
                                                  </div>
                                                  <FilePreview fileUrl={item.fileUrl} fileType={item.fileType} title={item.title} />
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
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
                  {myResources.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                      <FileText className="w-12 h-12 mb-4 opacity-20" />
                      <p>You haven't uploaded any files yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myResources.map((resource) => (
                        <div key={resource.id} className="flex flex-col rounded-xl border border-border/40 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-sm line-clamp-1">{resource.title}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {resource.subject?.name || "General"} 
                                {resource.chapter ? ` • ${resource.chapter.title}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                              {resource.fileType}
                            </span>
                          </div>
                          <div className="mt-auto pt-3 border-t border-border/40">
                            <FilePreview fileUrl={resource.fileUrl} fileType={resource.fileType} title={resource.title} />
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
