"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import type { UserRole } from "@/lib/navigation/types";
import { getNavigationForRole } from "@/lib/navigation";

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

type ShellTopbarProps = {
  role: UserRole;
  name: string;
};

/**
 * Sticky top bar for every role: hamburger drawer (full role nav) on mobile,
 * brand, theme toggle, sign out, and the user's avatar.
 */
export function ShellTopbar({ role, name }: ShellTopbarProps) {
  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 transition-all">
      <div className="flex items-center gap-2 flex-1 md:flex-none">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              className="flex items-center justify-center p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground shadow-sm cursor-pointer transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4 text-primary" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 flex flex-col bg-sidebar border-sidebar-border text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarDrawerContent role={role} />
            </SheetContent>
          </Sheet>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1 rounded-md shadow-sm">
            <Book className="w-4 h-4" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Classroom OS</span>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <ThemeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sign Out"
            aria-label="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-semibold text-muted-foreground transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </form>
        <Avatar className="h-8 w-8 ring-1 ring-border/50 hover:ring-border transition-all">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function SidebarDrawerContent({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const navigation = getNavigationForRole(role);

  return (
    <>
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

      <nav aria-label="Menu" className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
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
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm",
                      isActive
                        ? "bg-primary text-white font-semibold shadow-sm shadow-primary/30"
                        : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "opacity-70")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
