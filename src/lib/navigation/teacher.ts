import { Book, CheckCircle, ClipboardCheck, FileText, FolderOpen, Home, Clock } from "lucide-react";
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
        { label: "My Subjects", href: "/subjects", icon: Book },
        { label: "Attendance", href: "/teacher/attendance", icon: CheckCircle },
        { label: "Class History", href: "/teacher/lecture-logs", icon: FileText },
        { label: "Resources", href: "/teacher/resources", icon: FolderOpen },
      ],
    },
    {
      title: "Work",
      items: [{ label: "Grading", href: "/teacher/grading", icon: ClipboardCheck, badgeKey: "pendingGrading" }],
    },
  ],
  mobileTabs: [
    { label: "Home", href: "/teacher", icon: Home },
    { label: "Today", href: "/today", icon: Clock },
    { label: "Grading", href: "/teacher/grading", icon: ClipboardCheck, badgeKey: "pendingGrading" },
  ],
};
