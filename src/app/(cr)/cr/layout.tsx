import { AppShell } from "@/components/shell/app-shell";
import { requireAuth } from "@/lib/auth";
import { getSubjectsForSidebar } from "@/features/subjects/queries";
import { getNavBadges } from "@/lib/navigation/badges";

export const dynamic = "force-dynamic";

export default async function CRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // RBAC Guard: Allow CR, ADMIN, and TEACHER (so teachers can access /cr/take-attendance)
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const [subjects, badges] = await Promise.all([getSubjectsForSidebar(), getNavBadges()]);

  return (
    <AppShell user={{ role: user.role, name: user.name }} subjects={subjects} badges={badges}>
      {children}
    </AppShell>
  );
}
