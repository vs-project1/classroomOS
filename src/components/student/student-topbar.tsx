import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function StudentTopbar() {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-10">
      <div className="flex-1 md:hidden">
        {/* Mobile title or logo */}
        <span className="font-bold text-lg">Classroom OS</span>
      </div>
      
      <div className="hidden md:flex flex-1 items-center max-w-md bg-muted/50 rounded-full px-3 py-1.5 focus-within:bg-background focus-within:ring-1 focus-within:ring-ring border border-transparent focus-within:border-border transition-all">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          type="text" 
          placeholder="Search for assignments, classes..." 
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src="https://i.pravatar.cc/150?u=student" />
          <AvatarFallback>ST</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
