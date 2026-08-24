import { Bell, Book, CalendarDays, CalendarOff, CalendarRange, CheckCircle, Clock, FileText, GraduationCap, Home, Inbox } from "lucide-react";
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
      title: "ACADEMICS",
      items: [
        { label: "My Subjects", href: "/subjects", icon: GraduationCap },
        { label: "Timetable", href: "/routine", icon: CalendarRange, activePatterns: ["/routine"] },
        { label: "Class History", href: "/lecture-logs", icon: FileText },
        { label: "What You Missed", href: "/missed", icon: CalendarOff },
      ],
    },
    {
      title: "Work",
      items: [{ label: "Assignments", href: "/homework", icon: Book, badgeKey: "assignmentsDue" }],
    },
    {
      title: "Class",
      items: [{ label: "Attendance", href: "/attendance", icon: CheckCircle }],
    },
    {
      title: "Campus",
      items: [
        { label: "Notices", href: "/notices", icon: Bell },
        { label: "Events", href: "/events", icon: CalendarDays },
        { label: "Notifications", href: "/notifications", icon: Inbox, badgeKey: "notifications" },
      ],
    },
  ],
  mobileTabs: [
    { label: "Home", href: "/", icon: Home },
    { label: "Today", href: "/today", icon: Clock },
    { label: "Subjects", href: "/subjects", icon: GraduationCap },
  ],
};
