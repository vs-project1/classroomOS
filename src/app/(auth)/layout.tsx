import React from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground/75">
        <p>Classroom OS • Private Academic System</p>
      </footer>
    </div>
  );
}
