import type { NavBadgeKey, NavBadges } from "./types";
export type { NavBadgeKey, NavBadges };

import { and, count, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { assignmentSubmissions, enrollments, homework, notifications, subjects } from "@/db/schema";
import { getCurrentUser, resolveCurrentStudent, type SessionUser } from "@/lib/auth";

/**
 * Server-resolved navigation badge counts for the current session user.
 * Every query is scoped strictly to the authenticated user's own academic
 * scope (enrollments via their student profile / subjects via teacherId).
 */
export async function getNavBadges(): Promise<NavBadges> {
  const user = await getCurrentUser();
  if (!user) return {};

  const [roleBadges, unreadNotifications] = await Promise.all([
    getRoleBadges(user),
    getUnreadNotificationsBadge(user.id),
  ]);

  return { ...roleBadges, ...unreadNotifications };
}

async function getRoleBadges(user: SessionUser): Promise<NavBadges> {
  switch (user.role) {
    case "STUDENT":
    case "CR":
      return getAssignmentsDueBadge();
    case "TEACHER":
      return getPendingGradingBadge(user);
    case "ADMIN":
    default:
      return {};
  }
}

async function getUnreadNotificationsBadge(userId: string): Promise<NavBadges> {
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  const notifications_ = Number(rows[0]?.value ?? 0);
  return notifications_ > 0 ? { notifications: notifications_ } : {};
}

async function getAssignmentsDueBadge(): Promise<NavBadges> {
  const student = await resolveCurrentStudent();
  if (!student) return {};

  const rows = await db
    .select({ value: count() })
    .from(homework)
    .innerJoin(enrollments, eq(homework.subjectId, enrollments.subjectId))
    .leftJoin(
      assignmentSubmissions,
      and(
        eq(assignmentSubmissions.homeworkId, homework.id),
        eq(assignmentSubmissions.studentId, student.id),
        inArray(assignmentSubmissions.status, ["submitted", "graded", "late"])
      )
    )
    .where(
      and(
        eq(enrollments.studentId, student.id),
        eq(homework.status, "active"),
        gt(homework.dueDate, new Date()),
        isNull(assignmentSubmissions.id)
      )
    );

  const assignmentsDue = Number(rows[0]?.value ?? 0);
  return assignmentsDue > 0 ? { assignmentsDue } : {};
}

async function getPendingGradingBadge(user: SessionUser): Promise<NavBadges> {
  if (!user.teacherId) return {};

  const rows = await db
    .select({ value: count() })
    .from(assignmentSubmissions)
    .innerJoin(homework, eq(assignmentSubmissions.homeworkId, homework.id))
    .innerJoin(subjects, eq(homework.subjectId, subjects.id))
    .where(and(eq(subjects.teacherId, user.teacherId), inArray(assignmentSubmissions.status, ["submitted", "late"])));

  const pendingGrading = Number(rows[0]?.value ?? 0);
  return pendingGrading > 0 ? { pendingGrading } : {};
}
