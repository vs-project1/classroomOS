"use client";

import { Home, Clock, CalendarRange, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Today", url: "/today", icon: Clock },
  { title: "Routine", url: "/routine", icon: CalendarRange },
  { title: "Notices", url: "/notices", icon: Bell },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl pb-safe flex items-center justify-around px-2 h-16 z-50">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url));
        return (
          <Link
            key={item.title}
            href={item.url}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200",
              isActive ? "text-primary font-bold" : "text-foreground/75 hover:text-foreground font-semibold"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all duration-200",
              isActive ? "bg-primary/10 text-primary" : "bg-transparent"
            )}>
              <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
            </div>
            <span className="text-xs tracking-tight">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
