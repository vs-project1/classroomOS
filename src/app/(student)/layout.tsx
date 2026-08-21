import { AppShell } from "@/components/shell/app-shell";
import { requireAuth } from "@/lib/auth";
import { getSubjectsForSidebar } from "@/features/subjects/queries";
import { getNavBadges } from "@/lib/navigation/badges";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Allow STUDENT, CR, TEACHER, ADMIN (shared academic surface)
  const user = await requireAuth(["STUDENT", "CR", "TEACHER", "ADMIN"]);
  const [subjects, badges] = await Promise.all([getSubjectsForSidebar(), getNavBadges()]);

  return (
    <AppShell user={{ role: user.role, name: user.name }} subjects={subjects} badges={badges}>
      {children}
    </AppShell>
  );
}
