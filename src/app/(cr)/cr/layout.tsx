import { CRSidebar } from "@/components/cr/cr-sidebar";
import { CRTopbar } from "@/components/cr/cr-topbar";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Strictly require CR role
  const user = await requireAuth(["CR", "ADMIN"]);

  return (
    <div className="flex h-screen overflow-hidden">
      <CRSidebar />
      <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
        <CRTopbar />
        <main className="flex-1 p-4 md:p-6 pb-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
