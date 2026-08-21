import type { SessionUser } from "@/lib/auth";
import type { NavBadges } from "@/lib/navigation/types";
import type { SidebarSubject } from "@/features/subjects/queries";
import { DesktopSidebar } from "./desktop-sidebar";
import { ShellTopbar } from "./shell-topbar";
import { MobileBottomNav } from "./mobile-bottom-nav";

type AppShellProps = {
  user: Pick<SessionUser, "role" | "name">;
  subjects: SidebarSubject[];
  badges: NavBadges;
  children: React.ReactNode;
};

/**
 * Role-aware application shell. The session user's role — not the URL —
 * decides which chrome renders, so shared routes (e.g. /today) always show
 * the correct navigation for the signed-in role.
 */
export function AppShell({ user, subjects, badges, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar role={user.role} badges={badges} subjects={subjects} />
      <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
        <ShellTopbar role={user.role} name={user.name} />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-8 w-full max-w-7xl mx-auto">{children}</main>
      </div>
      <MobileBottomNav role={user.role} badges={badges} />
    </div>
  );
}
