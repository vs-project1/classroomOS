import { TeacherSidebar, SidebarSubjectsProvider } from "@/components/teacher/teacher-sidebar";
import { TeacherTopbar } from "@/components/teacher/teacher-topbar";
import { requireAuth } from "@/lib/auth";
import { getSubjectsForSidebar } from "@/features/subjects/queries";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Strictly require TEACHER role
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  const subjects = await getSubjectsForSidebar();

  return (
    <SidebarSubjectsProvider subjects={subjects}>
      <div className="flex h-screen overflow-hidden">
        <TeacherSidebar subjects={subjects} />
        <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
          <TeacherTopbar />
          <main className="flex-1 p-4 md:p-6 pb-8 w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarSubjectsProvider>
  );
}
