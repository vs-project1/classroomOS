"use client";

import { Home, Clock, CalendarRange, Bell, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Today", url: "/today", icon: Clock },
  { title: "Routine", url: "/routine", icon: CalendarRange },
  { title: "Notices", url: "/notices", icon: Bell },
  { title: "Menu", url: "/menu", icon: MoreHorizontal },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t pb-safe flex items-center justify-around px-2 h-16 z-50">
      {bottomNavItems.map((item) => {
        const isActive = pathname === item.url || (item.url !== "/" && pathname?.startsWith(item.url));
        return (
          <Link
            key={item.title}
            href={item.url}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
