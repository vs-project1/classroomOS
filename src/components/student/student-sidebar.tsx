"use client";

import { createContext, useContext, useId, useState } from "react";
import { Home, Clock, CalendarRange, CheckCircle, Book, BookOpen, ChevronDown, Bell, CalendarDays, FileText, Menu, GraduationCap, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { logoutAction } from "@/app/actions/auth";
import type { SidebarSubject } from "@/features/subjects/queries";

import { studentNavigation } from "@/lib/navigation";

const SidebarSubjectsContext = createContext<SidebarSubject[]>([]);

export function SidebarSubjectsProvider({
  subjects,
  children,
}: {
  subjects: SidebarSubject[];
  children: React.ReactNode;
}) {
  return (
    <SidebarSubjectsContext.Provider value={subjects}>
      {children}
    </SidebarSubjectsContext.Provider>
  );
}

function SubjectChildLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "block px-3 py-1.5 rounded-lg truncate transition-all font-medium text-sm",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      {label}
    </Link>
  );
}

function SubjectsDropdown({ subjects }: { subjects: SidebarSubject[] }) {
  const pathname = usePathname();
  const sectionId = useId();
  const [open, setOpen] = useState(() => !!pathname?.startsWith("/subjects"));

  const isIndexActive = pathname === "/subjects";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={sectionId}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm cursor-pointer",
          isIndexActive
            ? "bg-primary text-white font-semibold shadow-sm shadow-primary/30"
            : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <BookOpen className={cn("w-4 h-4 shrink-0", isIndexActive ? "text-white" : "opacity-70")} />
        <span className="flex-1 text-left">Subjects</span>
        <span
          className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none",
            isIndexActive ? "bg-white/20 text-white" : "bg-sidebar-accent text-sidebar-foreground/60"
          )}
        >
          {subjects.length}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
            !isIndexActive && "opacity-70"
          )}
        />
      </button>
      {open && (
        <div id={sectionId} className="ml-4 mt-1 pl-3 border-l border-sidebar-border/60 space-y-0.5">
          {subjects.length > 0 ? (
            <>
              <SubjectChildLink href="/subjects" label="All Subjects" isActive={isIndexActive} />
              {subjects.map((subject) => (
                <SubjectChildLink
                  key={subject.id}
                  href={`/subjects/${subject.slug}`}
                  label={subject.name}
                  isActive={pathname === `/subjects/${subject.slug}`}
                />
              ))}
            </>
          ) : (
            <p className="px-3 py-2 text-xs font-medium text-sidebar-foreground/50">No subjects yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarNav({ subjects: subjectsProp }: { subjects?: SidebarSubject[] } = {}) {
  const pathname = usePathname();
  const contextSubjects = useContext(SidebarSubjectsContext);
  const subjects = subjectsProp ?? contextSubjects;

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
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">Student Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="px-4 py-4">
        <span className="px-3 text-xs font-bold text-sidebar-foreground/80 tracking-wider uppercase">Menu</span>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {studentNavigation.map((item) => {
          if (item.url === "/subjects") {
            return <SubjectsDropdown key={item.title} subjects={subjects} />;
          }
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

export function StudentSidebar({ subjects }: { subjects: SidebarSubject[] }) {
  return (
    <aside className="max-md:hidden flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0 text-sidebar-foreground z-20">
      <SidebarNav subjects={subjects} />
    </aside>
  );
}

export function StudentMobileMenuTrigger() {
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
