import type { LucideIcon } from "lucide-react";

export type UserRole = "STUDENT" | "TEACHER" | "CR" | "ADMIN";

export type NavBadgeKey = "assignmentsDue" | "pendingDisputes" | "notifications";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
  /** Extra hrefs that activate this item (segment-boundary match). */
  activePatterns?: string[];
};

export type NavSection = {
  /** Undefined → top block rendered without a heading. */
  title?: string;
  items: NavItem[];
};

export type MobileTab = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: NavBadgeKey;
};

export type NavBadges = Partial<Record<NavBadgeKey, number>>;

export const badgeUnitLabels: Record<NavBadgeKey, string> = {
  assignmentsDue: "due",
  pendingDisputes: "pending",
  notifications: "unread",
};

export type RoleNavigation = {
  portalLabel: string;
  footer: { title: string; subtitle?: string };
  sections: NavSection[];
  mobileTabs: MobileTab[];
};

/**
 * Segment-boundary-safe active matcher.
 * "/" matches only exactly "/"; every other href matches itself or any
 * descendant path at a segment boundary ("/subjects" activates on
 * "/subjects/dbms" but NOT on "/subjects-extra").
 */
function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/" || href === "/teacher" || href === "/admin" || href === "/cr") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavItemActive(
  pathname: string | null,
  item: Pick<NavItem, "href" | "activePatterns">
): boolean {
  if (isNavActive(pathname, item.href)) return true;
  return Boolean(item.activePatterns?.some((pattern) => isNavActive(pathname, pattern)));
}
