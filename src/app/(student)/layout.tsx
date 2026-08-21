import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentTopbar } from "@/components/student/student-topbar";
import { MobileNavbar } from "@/components/student/mobile-navbar";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Allow STUDENT, CR, TEACHER, ADMIN (teachers view student pages per nav)
  const user = await requireAuth(["STUDENT", "CR", "TEACHER", "ADMIN"]);

  return (
    <div className="flex h-screen overflow-hidden">
      <StudentSidebar />
      <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
        <StudentTopbar />
        <MobileNavbar />
        <main className="flex-1 p-4 md:p-6 pb-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
