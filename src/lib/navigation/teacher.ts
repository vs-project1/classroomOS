import { Book, CalendarRange, CheckCircle, FileText, FolderOpen, Home, Inbox, Clock, ClipboardList } from "lucide-react";
import type { RoleNavigation } from "./types";

export const teacherNavigation: RoleNavigation = {
  portalLabel: "Teacher Portal",
  footer: { title: "Teacher Portal" },
  sections: [
    {
      items: [
        { label: "Home", href: "/teacher", icon: Home },
        { label: "Today", href: "/today", icon: Clock },
      ],
    },
    {
      title: "Teaching",
      items: [
        { label: "My Subjects", href: "/teacher/subjects", icon: Book },
        { label: "Assignments", href: "/teacher/homework", icon: ClipboardList },
        { label: "Routine", href: "/teacher/routine", icon: CalendarRange },
        { label: "Attendance", href: "/teacher/attendance", icon: CheckCircle, badgeKey: "pendingDisputes" },
        { label: "Class History", href: "/teacher/lecture-logs", icon: FileText },
        { label: "Resources", href: "/teacher/resources", icon: FolderOpen },
      ],
    },
    {
      title: "Work",
      items: [
        { label: "Notifications", href: "/notifications", icon: Inbox, badgeKey: "notifications" },
      ],
    },
  ],
  mobileTabs: [
    { label: "Home", href: "/teacher", icon: Home },
    { label: "Today", href: "/today", icon: Clock },
    { label: "Attendance", href: "/teacher/attendance", icon: CheckCircle },
  ],
};
