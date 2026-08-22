"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import type { SidebarSubject } from "@/features/subjects/queries";
import type { NavBadges, UserRole } from "@/lib/navigation/types";
import { isNavItemActive } from "@/lib/navigation/types";
import { getNavigationForRole } from "@/lib/navigation";
import { NavBadge } from "./nav-badge";

type NavVariant = "sidebar" | "drawer";

type NavContentProps = {
  role: UserRole;
  /** Overrides the live router pathname when provided. */
  pathname?: string | null;
  /** Footer context card + Sign Out. Defaults to true for the sidebar, false for the drawer. */
  showFooter?: boolean;
  /** Badge pills + sr-only counts. Renders nothing without a `badges` record. */
  showBadges?: boolean;
  badges?: NavBadges;
  /** Teacher footer shows an assigned-subject count instead of the static subtitle. */
  subjects?: SidebarSubject[];
  variant: NavVariant;
};

/**
 * Shared brand block for both chrome variants. The drawer's dialog and the
 * desktop aside must stay visually identical here.
 */
function BrandHeader({ portalLabel }: { portalLabel: string }) {
  return (
    <div className="px-6 py-6 pb-4 border-b border-sidebar-border/40">
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
        <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md shadow-primary/20">
          <Book className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight block text-sidebar-foreground">Classroom OS</span>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">
            {portalLabel}
          </span>
        </div>
      </Link>
    </div>
  );
}

/**
 * Single renderer for the desktop sidebar (`variant="sidebar"`) and the
 * mobile hamburger drawer (`variant="drawer"`). The nav tree drives
 * everything; activity comes from `isNavItemActive` so `activePatterns`
 * are honored everywhere.
 */
export function NavContent({
  role,
  pathname: pathnameProp,
  showFooter,
  showBadges,
  badges,
  subjects,
  variant,
}: NavContentProps) {
  const livePathname = usePathname();
  const pathname = pathnameProp ?? livePathname;
  const navigation = getNavigationForRole(role);

  const withFooter = showFooter ?? variant === "sidebar";
  const withBadges = (showBadges ?? true) && Boolean(badges);

  const footerSubtitle =
    role === "TEACHER"
      ? `${subjects?.length ?? 0} Assigned Subject${(subjects?.length ?? 0) === 1 ? "" : "s"}`
      : navigation.footer.subtitle;

  // The drawer historically omits `cursor-pointer` on links; kept verbatim
  // so neither surface's DOM changes in this extraction.
  const linkBaseClass =
    variant === "sidebar"
      ? "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm cursor-pointer"
      : "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm";

  return (
    <>
      {/* Brand Header */}
      <BrandHeader portalLabel={navigation.portalLabel} />

      {/* Sectioned Navigation */}
      <nav
        aria-label={variant === "sidebar" ? "Primary" : "Menu"}
        className="flex-1 px-3 py-4 space-y-4 overflow-y-auto"
      >
        {navigation.sections.map((section, sectionIndex) => (
          <div key={section.title ?? `top-${sectionIndex}`}>
            {section.title && (
              <p className="px-3 pb-1.5 text-xs font-bold text-sidebar-foreground/60 tracking-wider uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isNavItemActive(pathname, item);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      linkBaseClass,
                      isActive
                        ? "bg-primary text-white font-semibold shadow-sm shadow-primary/30"
                        : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "opacity-70")} />
                    <span>{item.label}</span>
                    {item.badgeKey && withBadges && badges && (
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
      {withFooter && (
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
      )}
    </>
  );
}
