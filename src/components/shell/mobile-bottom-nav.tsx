"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import type { NavBadges, UserRole } from "@/lib/navigation/types";
import { getNavigationForRole } from "@/lib/navigation";
import { NavBadge } from "./nav-badge";

type MobileBottomNavProps = {
  role: UserRole;
  badges: NavBadges;
};

/**
 * Fixed bottom tab bar (primary destinations) + "More" sheet (remaining role
 * items and Sign Out). Replaces the legacy horizontally scrolling pill bar.
 */
export function MobileBottomNav({ role, badges }: MobileBottomNavProps) {
  const pathname = usePathname();
  const navigation = getNavigationForRole(role);

  const tabHrefs = new Set(navigation.mobileTabs.map((tab) => tab.href));
  const moreItems = navigation.sections
    .flatMap((section) => section.items)
    .filter((item) => !tabHrefs.has(item.href));

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Primary mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-md"
    >
      <div className="grid grid-cols-4">
        {navigation.mobileTabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.badgeKey && (
                  <span className="absolute -top-1.5 -right-2">
                    <NavBadge count={badges[tab.badgeKey]} />
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="More navigation"
          >
            <LayoutGrid className="w-5 h-5" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] p-0 rounded-t-2xl">
            <SheetTitle className="sr-only">More navigation</SheetTitle>
            <div className="overflow-y-auto px-3 py-3">
              <p className="px-2 pb-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
                More
              </p>
              <div className="grid grid-cols-2 gap-1">
                {moreItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
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
