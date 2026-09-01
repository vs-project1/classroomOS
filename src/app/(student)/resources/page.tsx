import { getAllStudentResources } from "@/features/resources/queries";
import { requireAuth } from "@/lib/auth";
import { FolderDown } from "lucide-react";
import { ResourcesClient } from "./resources-client";

export const metadata = {
  title: "Study Materials & Library | Classroom OS",
  description: "Access PPTs, notes, and resources uploaded by teachers for your subjects",
};

export default async function ResourcesPage() {
  await requireAuth(["STUDENT", "CR"]);
  const { resourcesList, availableSubjects } = await getAllStudentResources();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <FolderDown className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Study Materials Library</h1>
            <p className="text-xs text-muted-foreground">
              All presentation slides, lecture notes, and reference files shared by your faculty
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Client List */}
      <ResourcesClient initialResources={resourcesList} availableSubjects={availableSubjects} />
    </div>
  );
}
