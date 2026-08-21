import { Home, GraduationCap, Clock, CalendarRange, CheckCircle, Book, Bell, CalendarDays, FileText, ShieldCheck, Users, BookOpen } from "lucide-react";

export type NavItem = {
  title: string;
  mobileTitle?: string;
  url: string;
  icon: any;
};

export const studentNavigation: NavItem[] = [
  { title: "Dashboard", mobileTitle: "Home", url: "/", icon: Home },
  { title: "Subjects", url: "/subjects", icon: GraduationCap },
  { title: "Today's Schedule", mobileTitle: "Today", url: "/today", icon: Clock },
  { title: "Weekly Routine", mobileTitle: "Routine", url: "/routine", icon: CalendarRange },
  { title: "Attendance", url: "/attendance", icon: CheckCircle },
  { title: "Lecture Logs", mobileTitle: "Logs", url: "/lecture-logs", icon: FileText },
  { title: "Assignments", url: "/homework", icon: Book },
  { title: "Notice Board", mobileTitle: "Notices", url: "/notices", icon: Bell },
  { title: "Events & Calendar", mobileTitle: "Events", url: "/events", icon: CalendarDays },
];

export const adminNavigation: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Accounts & Auth", url: "/admin/accounts", icon: ShieldCheck },
  { title: "Assignments", url: "/admin/homework", icon: Book },
  { title: "Notice Board", url: "/admin/notices", icon: Bell },
  { title: "Events & Calendar", url: "/admin/events", icon: CalendarDays },
  { title: "Teachers", url: "/admin/teachers", icon: GraduationCap },
  { title: "Students", url: "/admin/students", icon: Users },
  { title: "Subjects", url: "/admin/subjects", icon: BookOpen },
];

export const teacherNavigation: NavItem[] = [
  { title: "Dashboard", url: "/teacher", icon: Home },
  { title: "Today's Classes", url: "/today", icon: Clock }, // Still using shared route for now
  { title: "Grade Submissions", url: "/teacher/grading", icon: CheckCircle },
  { title: "Resources", url: "/teacher/resources", icon: FileText },
  { title: "Attendance", url: "/attendance", icon: CheckCircle },
  { title: "Lecture Logs", url: "/lecture-logs", icon: FileText },
];

export const crNavigation: NavItem[] = [
  { title: "Dashboard", url: "/cr", icon: Home },
  { title: "Log Session", url: "/cr/log-session", icon: FileText },
];
