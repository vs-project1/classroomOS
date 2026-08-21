import { AppSidebar, AdminMobileMenuTrigger } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col relative w-full overflow-y-auto">
        <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 md:hidden">
          <div className="flex items-center gap-3">
            <AdminMobileMenuTrigger />
            <span className="font-bold text-base text-primary">Admin Console</span>
          </div>
          <ThemeToggle />
        </header>
        <div className="hidden md:flex justify-end p-4 absolute top-0 right-0 z-20">
          <ThemeToggle />
        </div>
        <div role="region" aria-label="Admin Content" className="flex-1 p-4 md:p-6 w-full max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
