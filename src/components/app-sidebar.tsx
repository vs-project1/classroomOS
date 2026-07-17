import { BookOpen, Home, Users, Calendar, Clock, CalendarRange, Book, Bell, CalendarDays, GraduationCap } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Today", url: "/today", icon: Clock },
  { title: "Weekly Routine", url: "/routine", icon: CalendarRange },
  { title: "Sessions", url: "/sessions", icon: Calendar },
  { title: "Assignments", url: "/homework", icon: Book },
  { title: "Notices", url: "/notices", icon: Bell },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Teachers", url: "/teachers", icon: GraduationCap },
  { title: "Students", url: "/students", icon: Users },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Classroom OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<Link href={item.url} />}>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
