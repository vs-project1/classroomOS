import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { resources, subjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceForm } from "@/features/resources/components/resource-form";
import { FileText, Link as LinkIcon, Download } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          <CardContent>
            {assignedSubjects.length > 0 ? (
              <ResourceForm subjects={assignedSubjects} />
            ) : (
              <p className="text-sm text-muted-foreground">You must be assigned to at least one subject to upload resources.</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your Resources</CardTitle>
            <CardDescription>Materials you have shared.</CardDescription>
          </CardHeader>
          <CardContent>
            {teacherResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No resources uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teacherResources.map(({ resource, subject }) => (
                  <div key={resource.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg shrink-0 mt-1">
                        {resource.fileType === "link" ? (
                          <LinkIcon className="w-5 h-5 text-primary" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{resource.title}</h3>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
