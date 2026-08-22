"use client";

import type { SidebarSubject } from "@/features/subjects/queries";
import type { NavBadges, UserRole } from "@/lib/navigation/types";
import { NavContent } from "./nav-content";

type DesktopSidebarProps = {
  role: UserRole;
  badges: NavBadges;
  subjects: SidebarSubject[];
};

export function DesktopSidebar(props: DesktopSidebarProps) {
  return (
    <aside className="max-md:hidden flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20">
      <NavContent variant="sidebar" {...props} />
    </aside>
  );
}
