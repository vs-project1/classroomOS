import { Book, Bell, CalendarDays, CalendarRange, ClipboardCheck, FileText, GraduationCap, Home, ShieldCheck, Users } from "lucide-react";
import type { RoleNavigation } from "./types";

export const adminNavigation: RoleNavigation = {
  portalLabel: "Admin Console",
  footer: { title: "Administrator Mode" },
  sections: [
    {
      items: [{ label: "Dashboard", href: "/admin", icon: Home }],
    },
    {
      title: "People",
      items: [
        { label: "Students", href: "/admin/students", icon: Users },
        { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
        { label: "Accounts", href: "/admin/accounts", icon: ShieldCheck },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "Subjects", href: "/admin/subjects", icon: Book },
        { label: "Assignments", href: "/admin/homework", icon: ClipboardCheck },
        { label: "Monthly Ledger", href: "/admin/attendance/monthly", icon: CalendarDays },
      ],
    },
    {
      title: "Campus",
      items: [
        { label: "Notices", href: "/admin/notices", icon: Bell, badgeKey: "notifications" },
        { label: "Events", href: "/admin/events", icon: CalendarDays },
      ],
    },
    {
      title: "System",
      items: [{ label: "Attendance Reviews", href: "/admin/attendance", icon: FileText }],
    },
  ],
  mobileTabs: [
    { label: "Dashboard", href: "/admin", icon: Home },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Notices", href: "/admin/notices", icon: Bell },
  ],
};
