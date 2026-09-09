import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AddUnitDialog } from "@/features/subjects/components/add-unit-dialog";
import { AddChapterDialog } from "@/features/subjects/components/add-chapter-dialog";
import { AddResourceModal } from "@/features/resources/components/add-resource-modal";
import { AddMaterialDialog } from "./components";
import { FileText, Video, Link as LinkIcon, File, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function getMaterialIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (type === "video" || type === "mp4") return <Video className="h-4 w-4 text-muted-foreground" />;
  if (type === "link" || type === "url") return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
  if (type === "pdf" || type === "document") return <FileText className="h-4 w-4 text-muted-foreground" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const subject = await db.query.subjects.findFirst({
    where: or(eq(subjects.id, id), eq(subjects.slug, id)),
    with: {
      courseUnits: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          resources: {
            orderBy: (res, { desc }) => [desc(res.createdAt)],
          },
          courseChapters: {
            orderBy: (chapters, { asc }) => [asc(chapters.order)],
            with: {
              courseMaterials: true,
              resources: {
                orderBy: (res, { desc }) => [desc(res.createdAt)],
              },
            }
          }
        }
      }
    }
  });

  if (!subject) return notFound();

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-10 p-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/subjects" className={buttonVariants({ variant: "ghost", size: "icon", className: "cursor-pointer" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Course Content</p>
            <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
              {subject.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/resources" className={buttonVariants({ variant: "outline" })}>
            <FileText className="h-4 w-4 mr-1.5" /> Class Resources
          </Link>
          <AddUnitDialog subjectId={subject.id} />
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {subject.courseUnits.length === 0 && (
          <p className="text-muted-foreground text-sm">No units added yet. Get started by adding a unit.</p>
        )}
        
        {subject.courseUnits.map((unit) => (
          <div key={unit.id} className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                {unit.title}
              </h2>
              <div className="flex items-center gap-2">
                <AddResourceModal
                  subjectId={subject.id}
                  subjectName={subject.name}
                  unitId={unit.id}
                  unitTitle={unit.title}
                  targetLabel={`Unit: ${unit.title}`}
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                      <Plus className="h-3.5 w-3.5 text-primary" /> Add Resource to Unit
                    </Button>
                  }
                />
                <AddChapterDialog unitId={unit.id} subjectId={subject.id} unitTitle={unit.title} />
              </div>
            </div>

            {/* Unit Resources Shelf (Direct Unit Materials & Master Slides) */}
            {unit.resources && unit.resources.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    📦 Unit Resources &amp; Master Slides ({unit.resources.length})
                  </span>
                  <AddResourceModal
                    subjectId={subject.id}
                    subjectName={subject.name}
                    unitId={unit.id}
                    unitTitle={unit.title}
                    targetLabel={`Unit: ${unit.title}`}
                    trigger={
                      <button type="button" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add more
                      </button>
                    }
                  />
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {unit.resources.map((res) => (
                    <li key={res.id} className="group flex items-center gap-2.5 rounded-lg border bg-background/80 p-2.5 hover:bg-background transition-colors">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-muted border shrink-0">
                        {getMaterialIcon(res.fileType)}
                      </div>
                      <a href={res.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-foreground hover:underline truncate flex-1">
                        {res.title}
                      </a>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0">
                        {res.fileType}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex flex-col gap-6 pl-4">
              {unit.courseChapters.length === 0 && (
                <p className="text-muted-foreground text-sm">No chapters in this unit yet.</p>
              )}
              
              {unit.courseChapters.map(chapter => (
                <div key={chapter.id} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between group">
                    <h3 className="text-base font-medium text-foreground">
                      {chapter.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <AddResourceModal
                        subjectId={subject.id}
                        subjectName={subject.name}
                        unitId={unit.id}
                        unitTitle={unit.title}
                        chapterId={chapter.id}
                        chapterTitle={chapter.title}
                        targetLabel={`Chapter: ${chapter.title}`}
                        trigger={
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
                            <Plus className="h-3 w-3 text-primary" /> Add Resource
                          </Button>
                        }
                      />
                      <AddMaterialDialog chapterId={chapter.id} subjectId={subject.id} />
                    </div>
                  </div>
                  
                  {(() => {
                    const combinedMaterials = [
                      ...chapter.courseMaterials.map((m) => ({ id: m.id, title: m.title, fileUrl: m.fileUrl, fileType: m.fileType })),
                      ...chapter.resources.map((r) => ({ id: r.id, title: r.title, fileUrl: r.fileUrl, fileType: r.fileType })),
                    ];

                    if (combinedMaterials.length === 0) {
                      return <p className="text-sm text-muted-foreground">No materials or resources added.</p>;
                    }

                    return (
                      <ul className="flex flex-col gap-2">
                        {combinedMaterials.map((mat) => (
                          <li key={mat.id} className="group flex items-center gap-3 rounded-md px-3 py-2 -ml-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-background border shadow-xs">
                              {getMaterialIcon(mat.fileType)}
                            </div>
                            <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:underline">
                              {mat.title}
                            </a>
                            <span className="text-xs text-muted-foreground uppercase ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                              {mat.fileType}
                            </span>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
