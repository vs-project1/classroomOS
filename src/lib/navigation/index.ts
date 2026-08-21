import type { NavBadges, UserRole } from "./types";
import { studentNavigation } from "./student";
import { teacherNavigation } from "./teacher";
import { crNavigation } from "./cr";
import { adminNavigation } from "./admin";

export type { NavBadges };
export function getNavigationForRole(role: UserRole) {
  switch (role) {
    case "TEACHER":
      return teacherNavigation;
    case "CR":
      return crNavigation;
    case "ADMIN":
      return adminNavigation;
    case "STUDENT":
    default:
      return studentNavigation;
  }
}
