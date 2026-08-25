"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, ChevronDown, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarSubject } from "@/features/subjects/queries";
import type { NavBadges, UserRole } from "@/lib/navigation/types";
import { isNavItemActive } from "@/lib/navigation/types";
import { getNavigationForRole } from "@/lib/navigation";
import { NavBadge } from "@/components/shell/nav-badge";

type AppSidebarProps = {
  role: UserRole;
  badges?: NavBadges;
  subjects?: SidebarSubject[];
};

function CourseSwitcher({ subjects }: { subjects?: SidebarSubject[] }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div data-testid="course-switcher" className="px-3 py-3 border-b border-sidebar-border/40">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="course-switcher-list"
        aria-label="Toggle course switcher"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary shrink-0" />
          <span>Courses</span>
          {subjects && subjects.length > 0 && <span className="ml-1 text-xs text-slate-500 font-normal">({subjects.length})</span>}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div id="course-switcher-list" className="mt-2 space-y-1 pl-1">
          {subjects && subjects.length > 0 ? (
            subjects.map((s) => (
              <Link
                key={s.id}
                href={`/subjects/${s.slug}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span className="truncate">{s.name}</span>
              </Link>
            ))
          ) : (
            <p className="px-2 py-1.5 text-xs text-slate-500">No courses enrolled</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Grouped app sidebar — delegates to role-aware navigation (ACADEMICS/Work/Class/Campus).
 * Keeps role filtering; headings use text-[11px] font-semibold tracking-[0.08em] text-slate-500.
 */
export function AppSidebar({ role, badges, subjects }: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRole(role);

  return (
    <aside className="flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20 max-md:hidden">
      <div className="px-6 py-6 pb-4 border-b border-sidebar-border/40">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md shadow-primary/20">
            <Book className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block text-sidebar-foreground">Classroom OS</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">{navigation.portalLabel}</span>
          </div>
        </Link>
      </div>

      {(role === "STUDENT" || role === "CR") && <CourseSwitcher subjects={subjects} />}

      <nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navigation.sections.map((section, idx) => (
          <div key={section.title ?? `top-${idx}`}>
            {section.title && <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{section.title}</p>}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isNavItemActive(pathname, item);
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
                    {item.badgeKey && badges && (
                      <>
                        <span className="sr-only">{badges[item.badgeKey] ? ` (${badges[item.badgeKey]})` : ""}</span>
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
    </aside>
  );
}

export default AppSidebar;
