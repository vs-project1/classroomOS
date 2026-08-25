import { Book, CalendarRange, CheckCircle, ClipboardEdit, Clock, FileText, Home, Inbox } from "lucide-react";
import type { RoleNavigation } from "./types";

export const crNavigation: RoleNavigation = {
  portalLabel: "Class Rep Portal",
  footer: { title: "Class Representative" },
  sections: [
    {
      items: [
        { label: "Home", href: "/cr", icon: Home },
        { label: "Today", href: "/today", icon: Clock },
      ],
    },
    {
      title: "Class Mgmt",
      items: [
        { label: "Log Session", href: "/cr/log-session", icon: ClipboardEdit },
        { label: "My Attendance", href: "/attendance", icon: CheckCircle },
        { label: "Class History", href: "/lecture-logs", icon: FileText },
      ],
    },
    {
      title: "My Class",
      items: [
        { label: "Subjects", href: "/subjects", icon: Book },
        { label: "Routine", href: "/routine", icon: CalendarRange },
        { label: "Notifications", href: "/notifications", icon: Inbox, badgeKey: "notifications" },
      ],
    },
  ],
  mobileTabs: [
    { label: "Home", href: "/cr", icon: Home },
    { label: "Today", href: "/today", icon: Clock },
    { label: "Log Session", href: "/cr/log-session", icon: ClipboardEdit },
  ],
};
