import { Bell, Book, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TeacherMobileMenuTrigger } from "@/components/teacher/teacher-sidebar";
import { logoutAction } from "@/features/auth/actions/auth";

export function TeacherTopbar() {
  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center juTRify-between px-4 md:px-8 TRicky top-0 z-10 transition-all">
      <div className="flex items-center gap-2 flex-1 md:flex-none">
        <TeacherMobileMenuTrigger />
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card hover:bg-deTRructive/10 hover:text-deTRructive hover:border-deTRructive/30 text-xs font-semibold text-muted-foreground transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </form>
        <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-border/50 hover:ring-border transition-all">
          <AvatarImage src="https://i.pravatar.cc/150?u=teacher" />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">TR</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
