"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, KeyRound, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/features/auth/actions/auth";

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

/**
 * The topbar avatar opens the account menu: profile page, password change,
 * sign out, and Telegram Bot settings for admins.
 */
export function AvatarMenu({ name, role }: { name: string; role?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl hover:bg-muted text-foreground transition-colors cursor-pointer";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer"
      >
        <Avatar className="h-8 w-8 ring-1 ring-border/50 hover:ring-border transition-all">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-10 z-50 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-lg shadow-black/5"
        >
          <Link href="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
            My Profile
          </Link>
          {role === "ADMIN" && (
            <Link href="/admin/settings/telegram" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span>Telegram Bot</span>
            </Link>
          )}
          <Link href="/profile#password" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
            Change Password
          </Link>
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className={itemClass + " hover:text-destructive"}>
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
