import { Bell, Book, CalendarDays, CalendarRange, CheckCircle, Clock, FileText, GraduationCap, Home, Inbox } from "lucide-react";
import type { RoleNavigation } from "./types";

export const studentNavigation: RoleNavigation = {
  portalLabel: "Student Portal",
  footer: { title: "BCA Program", subtitle: "TU FOHSS" },
  sections: [
    {
      items: [
        { label: "Home", href: "/", icon: Home },
        { label: "Today", href: "/today", icon: Clock },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "My Subjects", href: "/subjects", icon: GraduationCap },
        { label: "Assignments", href: "/homework", icon: Book, badgeKey: "assignmentsDue" },
        { label: "Attendance", href: "/attendance", icon: CheckCircle },
      ],
    },
    {
      title: "Class",
      items: [
        { label: "Routine", href: "/routine", icon: CalendarRange },
        { label: "Class History", href: "/lecture-logs", icon: FileText },
      ],
    },
    {
      title: "Campus",
      items: [
        { label: "Notices", href: "/notices", icon: Bell },
        { label: "Events", href: "/events", icon: CalendarDays },
        { label: "Notifications", href: "/notifications", icon: Inbox },
      ],
    },
  ],
  mobileTabs: [
    { label: "Home", href: "/", icon: Home },
    { label: "Today", href: "/today", icon: Clock },
    { label: "Subjects", href: "/subjects", icon: GraduationCap },
  ],
};
