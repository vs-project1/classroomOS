"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import type { SidebarSubject } from "@/features/subjects/queries";
import type { NavBadges, UserRole } from "@/lib/navigation/types";
import { getNavigationForRole } from "@/lib/navigation";
import { NavBadge } from "./nav-badge";

type SidebarNavContentProps = {
  role: UserRole;
  badges: NavBadges;
  subjects: SidebarSubject[];
};

/**
 * Shared renderer for the desktop sidebar and the mobile drawer.
 * Single implementation for every role — the nav tree drives everything.
 */
export function SidebarNavContent({ role, badges, subjects }: SidebarNavContentProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRole(role);

  const footerSubtitle =
    role === "TEACHER"
      ? `${subjects.length} Assigned Subject${subjects.length === 1 ? "" : "s"}`
      : navigation.footer.subtitle;

  return (
    <>
      {/* Brand Header */}
      <div className="px-6 py-6 pb-4 border-b border-sidebar-border/40">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md shadow-primary/20">
            <Book className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block text-sidebar-foreground">Classroom OS</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              {navigation.portalLabel}
            </span>
          </div>
        </Link>
      </div>

      {/* Sectioned Navigation */}
      <nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navigation.sections.map((section, sectionIndex) => (
          <div key={section.title ?? `top-${sectionIndex}`}>
            {section.title && (
              <p className="px-3 pb-1.5 text-xs font-bold text-sidebar-foreground/60 tracking-wider uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`) ||
                      (item.activePatterns?.some((pattern) =>
                        pattern === "/" ? pathname === "/" : pathname === pattern || pathname?.startsWith(`${pattern}/`)
                      ) ?? false);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm cursor-pointer",
                      isActive
                        ? "bg-primary text-white font-semibold shadow-sm shadow-primary/30"
                        : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "opacity-70")} />
                    <span>{item.label}</span>
                    {item.badgeKey && (
                      <>
                        <span className="sr-only">
                          {badges[item.badgeKey]
                            ? ` (${badges[item.badgeKey]} ${item.badgeKey === "assignmentsDue" ? "due" : "to grade"})`
                            : ""}
                        </span>
                        <span className="ml-auto">
                          <NavBadge count={badges[item.badgeKey]} variant="sidebar" />
                        </span>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info & Sign Out */}
      <div className="p-4 border-t border-sidebar-border/40 space-y-2.5 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 bg-sidebar-accent/50 rounded-2xl">
          <GraduationCap className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <p className="font-semibold text-sidebar-foreground">{navigation.footer.title}</p>
            {footerSubtitle && (
              <p className="text-xs text-sidebar-foreground/80 font-medium">{footerSubtitle}</p>
            )}
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-sidebar-border/60 hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30 text-xs font-semibold text-sidebar-foreground/80 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </>
  );
}

export function DesktopSidebar(props: SidebarNavContentProps) {
  return (
    <aside className="max-md:hidden flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20">
      <SidebarNavContent {...props} />
    </aside>
  );
}
