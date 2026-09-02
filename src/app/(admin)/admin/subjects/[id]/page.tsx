import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AddUnitDialog, AddChapterDialog, AddMaterialDialog } from "./components";
import { FileText, Video, Link as LinkIcon, File, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

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
          courseChapters: {
            orderBy: (chapters, { asc }) => [asc(chapters.order)],
            with: { courseMaterials: true }
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
        <AddUnitDialog subjectId={subject.id} />
      </div>

      <div className="flex flex-col gap-12">
        {subject.courseUnits.length === 0 && (
          <p className="text-muted-foreground text-sm">No units added yet. Get started by adding a unit.</p>
        )}
        
        {subject.courseUnits.map((unit, index) => (
          <div key={unit.id} className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b pb-2 group">
              <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                {unit.title}
              </h2>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <AddChapterDialog unitId={unit.id} subjectId={subject.id} />
              </div>
            </div>
            
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <AddMaterialDialog chapterId={chapter.id} subjectId={subject.id} />
                    </div>
                  </div>
                  
                  {chapter.courseMaterials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No materials added.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {chapter.courseMaterials.map(mat => (
                        <li key={mat.id} className="group flex items-center gap-3 rounded-md px-3 py-2 -ml-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-background border shadow-sm">
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
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
