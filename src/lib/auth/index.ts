export * from "./password";
export * from "./token";
export * from "./session";
export * from "./rbac";

import { cache } from "react";
import { getCurrentUser } from "./session";
import { getRolePermissions, RolePermissions, UserRole } from "./rbac";
import { db } from "@/db";
import { cookies } from "next/headers";

/**
 * Backward-compatible helper to get the current role string.
 */
export async function getCurrentRole(): Promise<UserRole> {
  const user = await getCurrentUser();
  if (user) return user.role;

  // Test fixture persona override (non-production only).
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const legacyRole = cookieStore.get("APP_ROLE")?.value;
    if (legacyRole === "ADMIN" || legacyRole === "TEACHER" || legacyRole === "CR" || legacyRole === "STUDENT") {
      return legacyRole;
    }
  }

  // Default deny: unverified callers get least privilege.
  return "STUDENT";
}

/**
 * Backward-compatible helper to get permission flags for the current user.
 */
export async function getPermissions(): Promise<RolePermissions> {
  const role = await getCurrentRole();
  return getRolePermissions(role);
}

/**
 * Backward-compatible resolver for finding the contextual student in the dashboard.
 */
export const resolveCurrentStudent = cache(async function resolveCurrentStudent() {
  const user = await getCurrentUser();
  if (user) {
    if (user.studentProfileId) {
      const profile = await db.query.studentProfiles.findFirst({
        where: (sp, { eq }) => eq(sp.id, user.studentProfileId!),
      });
      if (profile) {
        const student = await db.query.students.findFirst({
          where: (s, { eq }) => eq(s.rollNumber, profile.rollNumber),
        });
        if (student) return student;
      }
    }
    const student = await db.query.students.findFirst({
      where: (s, { eq }) => eq(s.email, user.email),
    });
    if (student) return student;
  }

  // Test fixture student override (non-production only).
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const envStudentId = cookieStore.get("DEMO_STUDENT_ID")?.value || process.env.DEMO_STUDENT_ID || null;

    if (envStudentId) {
      const student = await db.query.students.findFirst({
        where: (s, { eq }) => eq(s.id, envStudentId),
      });
      if (student) return student;
    }
  }

  return null;
});
