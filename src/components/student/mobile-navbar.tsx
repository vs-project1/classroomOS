"use client";

import { Home, GraduationCap, Clock, CalendarRange, CheckCircle, Book, Bell, CalendarDays, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { studentNavigation } from "@/lib/navigation";

export function MobileNavbar() {
  const pathname = usePathname();

  return (
    <div className="md:hidden w-full bg-card/90 backdrop-blur-md border-b border-border px-3 py-2 overflow-x-auto no-scrollbar sticky top-16 z-20">
      <div className="flex items-center gap-1.5 min-w-max">
        {studentNavigation.map((item) => {
          const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url));
          return (
            <Link
              key={item.title}
              href={item.url}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                  : "bg-muted/50 text-foreground/80 border-border/50 hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.mobileTitle || item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
