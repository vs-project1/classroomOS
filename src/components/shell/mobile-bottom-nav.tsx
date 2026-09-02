"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, LayoutGrid, LogOut } from "lucide-react";
import * as React from "react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/features/auth/actions/auth";
import type { SidebarSubject } from "@/features/subjects/queries";
import type { NavBadges, UserRole } from "@/lib/navigation/types";
import { badgeUnitLabels, isNavItemActive } from "@/lib/navigation/types";
import { getNavigationForRole } from "@/lib/navigation";
import { NavBadge } from "./nav-badge";

type MobileBottomNavProps = {
  role: UserRole;
  badges: NavBadges;
  subjects?: SidebarSubject[];
};

/**
 * Fixed bottom tab bar (primary destinations) + "More" sheet (remaining role
 * items and Sign Out). Replaces the legacy horizontally scrolling pill bar.
 */
export function MobileBottomNav({ role, badges, subjects }: MobileBottomNavProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRole(role);

  const tabHrefs = new Set(navigation.mobileTabs.map((tab) => tab.href));
  const moreSections = navigation.sections
    .map((section) => ({
      title: section.title,
      items: section.items.filter((item) => !tabHrefs.has(item.href)),
    }))
    .filter((section) => section.items.length > 0);
  const [courseOpen, setCourseOpen] = React.useState(true);
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-md"
    >
      <div className="grid grid-cols-4">
        {navigation.mobileTabs.map((tab) => {
          const isActive = isNavItemActive(pathname, tab);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.badgeKey && (
                  <>
                    <span className="sr-only">
                      {badges[tab.badgeKey]
                        ? ` (${badges[tab.badgeKey]} ${badgeUnitLabels[tab.badgeKey]})`
                        : ""}
                    </span>
                    <span className="absolute -top-1.5 -right-2">
                      <NavBadge count={badges[tab.badgeKey]} />
                    </span>
                  </>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="More navigation"
          >
            <LayoutGrid className="w-5 h-5" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] p-0 rounded-t-2xl">
            <SheetTitle className="sr-only">More navigation</SheetTitle>
            <div className="overflow-y-auto px-3 py-3 space-y-4">
              {/* Collapsible Course switcher — grouped sidebar parity on mobile */}
              <div data-testid="course-switcher" className="rounded-xl border border-border/60 overflow-hidden">
                <button
                  type="button"
                  aria-expanded={courseOpen}
                  aria-controls="mobile-course-switcher-list"
                  aria-label="Toggle course switcher"
                  onClick={() => setCourseOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                    <span>Courses</span>
                    {subjects && subjects.length > 0 && (
                      <span className="text-xs text-slate-500 font-normal">({subjects.length})</span>
                    )}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", courseOpen && "rotate-180")} />
                </button>
                {courseOpen && (
                  <div id="mobile-course-switcher-list" className="px-2 pb-2 space-y-1">
                    {subjects && subjects.length > 0 ? (
                      subjects.map((s) => (
                        <Link
                          key={s.id}
                          href={`/subjects/${s.slug}`}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/70 hover:bg-muted transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </Link>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-xs text-slate-500">No courses enrolled</p>
                    )}
                  </div>
                )}
              </div>
              {moreSections.map((section) => (
                <div key={section.title ?? "top"}>
                  {section.title && (
                    <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                      {section.title}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1">
                    {section.items.map((item) => {
                      const isActive = isNavItemActive(pathname, item);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            isActive
                              ? "bg-primary text-white font-semibold shadow-sm shadow-primary/30"
                              : "text-foreground/80 hover:bg-muted"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0 opacity-80" />
                          <span>{item.label}</span>
                          {item.badgeKey && <NavBadge count={badges[item.badgeKey]} />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <form action={logoutAction} className="px-1 pt-3 pb-2 border-t border-border/60 mt-3">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border/60 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-sm font-semibold text-muted-foreground transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
