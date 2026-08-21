import { CRSidebar, SidebarSubjectsProvider } from "@/components/cr/cr-sidebar";
import { CRTopbar } from "@/components/cr/cr-topbar";
import { requireAuth } from "@/lib/auth";
import { getSubjectsForSidebar } from "@/features/subjects/queries";

export const dynamic = "force-dynamic";

export default async function CRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Strictly require CR role
  const user = await requireAuth(["CR", "ADMIN"]);
  const subjects = await getSubjectsForSidebar();

  return (
    <SidebarSubjectsProvider subjects={subjects}>
      <div className="flex h-screen overflow-hidden">
        <CRSidebar subjects={subjects} />
        <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
          <CRTopbar />
          <main className="flex-1 p-4 md:p-6 pb-8 w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarSubjectsProvider>
  );
}
