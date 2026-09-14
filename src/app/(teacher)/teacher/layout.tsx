import { AppShell } from "@/components/shell/app-shell";
import { requireAuth } from "@/lib/auth";
import { getSubjectsForSidebar } from "@/features/subjects/queries";
import { getNavBadges } from "@/lib/navigation/badges";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Strictly require TEACHER role
  const user = await requireAuth(["TEACHER"]);
  const [subjects, badges] = await Promise.all([getSubjectsForSidebar(), getNavBadges()]);

  return (
    <AppShell user={{ role: user.role, name: user.name }} subjects={subjects} badges={badges}>
      {children}
    </AppShell>
  );
}
