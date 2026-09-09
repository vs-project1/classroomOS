import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, resources } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { ResourcesWorkspace } from "@/features/resources/components/resources-workspace";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  await requireAuth(["ADMIN"]);

  const allSubjects = await db.query.subjects.findMany({
    orderBy: [asc(subjects.name)],
    with: {
      courseUnits: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          resources: {
            orderBy: (resources, { desc }) => [desc(resources.createdAt)],
          },
          courseChapters: {
            orderBy: (chapters, { asc }) => [asc(chapters.order)],
            with: {
              resources: {
                orderBy: (resources, { desc }) => [desc(resources.createdAt)],
              },
            },
          },
        },
      },
    },
  });

  const allResources = await db.query.resources.findMany({
    with: {
      subject: true,
      unit: true,
      chapter: true,
    },
    orderBy: [desc(resources.createdAt)],
  });

  return (
    <ResourcesWorkspace
      title="College Resources Hub"
      subtitle="Manage, upload, and organize study materials and slides across all BCA subjects and units."
      subjects={allSubjects}
      resourcesList={allResources}
      canDelete={true}
    />
  );
}
