"use client";

import { Home, Clock, CalendarRange, CheckCircle, Book, Bell, CalendarDays, FileText, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const studentNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Today", url: "/today", icon: Clock },
  { title: "Weekly Routine", url: "/routine", icon: CalendarRange },
  { title: "Attendance", url: "/attendance", icon: CheckCircle },
  { title: "Lecture Logs", url: "/lecture-logs", icon: FileText },
  { title: "Homework", url: "/homework", icon: Book },
  { title: "Notices", url: "/notices", icon: Bell },
  { title: "Events", url: "/events", icon: CalendarDays },
];

export function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen sticky top-0 shrink-0 text-sidebar-foreground">
      <div className="p-6 pb-2">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Book className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Classroom OS</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {studentNavItems.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url));
          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-white/10 text-white font-medium" 
                  : "text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-white w-full px-3 py-2 transition-colors">
          <HelpCircle className="w-5 h-5" />
          <span>Need Help?</span>
        </button>
      </div>
    </aside>
  );
}
