import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { resources, subjects } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ResourcesWorkspace } from "@/features/resources/components/resources-workspace";

export const dynamic = "force-dynamic";

export default async function TeacherResourcesPage() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  if (user.role === "ADMIN") {
    redirect("/admin/resources");
  }

  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <h1 className="text-3xl font-bold font-fira-sans tracking-tight">Class Resources</h1>
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  const assignedSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, user.teacherId),
    orderBy: [asc(subjects.name)],
    with: {
      courseUnits: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          resources: {
            where: eq(resources.uploadedBy, user.teacherId),
            orderBy: (resources, { desc }) => [desc(resources.createdAt)],
          },
          courseChapters: {
            orderBy: (chapters, { asc }) => [asc(chapters.order)],
            with: {
              resources: {
                where: eq(resources.uploadedBy, user.teacherId),
                orderBy: (resources, { desc }) => [desc(resources.createdAt)],
              },
            },
          },
        },
      },
    },
  });

  const myResources = await db.query.resources.findMany({
    where: eq(resources.uploadedBy, user.teacherId),
    with: {
      subject: true,
      unit: true,
      chapter: true,
    },
    orderBy: [desc(resources.createdAt)],
  });

  return (
    <ResourcesWorkspace
      title="Class Resources"
      subtitle="Upload and organize study materials, slides, and handouts for your subjects."
      subjects={assignedSubjects}
      resourcesList={myResources}
      canDelete={true}
    />
  );
}
