"use client";

import { Home, Clock, CalendarRange, CheckCircle, Book, Bell, CalendarDays, FileText, Menu, GraduationCap, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/actions/auth";

import { teacherNavigation } from "@/lib/navigation";

function SidebarNav() {
  const pathname = usePathname();

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
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">Teacher Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="px-4 py-4">
        <span className="px-3 text-xs font-bold text-sidebar-foreground/80 tracking-wider uppercase">Menu</span>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {teacherNavigation.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url));
          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm cursor-pointer",
                isActive
                  ? "bg-primary text-white font-semibold shadow-sm shadow-primary/30"
                  : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "opacity-70")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info & Sign Out */}
      <div className="p-4 border-t border-sidebar-border/40 space-y-2.5 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 bg-sidebar-accent/50 rounded-2xl">
          <GraduationCap className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <p className="font-semibold text-sidebar-foreground">BCA Program</p>
            <p className="text-xs text-sidebar-foreground/80 font-medium">TU FOHSS</p>
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

export function TeacherSidebar() {
  return (
    <aside className="max-md:hidden flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20">
      <SidebarNav />
    </aside>
  );
}

export function TeacherMobileMenuTrigger() {
  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger
          className="flex items-center gap-2 p-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs shadow-sm cursor-pointer transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4 text-primary" />
          <span>Menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarNav />
        </SheetContent>
      </Sheet>
    </div>
  );
}
