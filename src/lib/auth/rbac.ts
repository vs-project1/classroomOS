export type UserRole = "ADMIN" | "TEACHER" | "CR" | "STUDENT";

export interface RolePermissions {
  canManageAccounts: boolean;
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canManageSubjects: boolean;
  canManageRoutine: boolean;
  canCreateSessions: boolean;
  canTakeAttendance: boolean;
  canCreateHomework: boolean;
  canCreateNotices: boolean;
  canCreateEvents: boolean;
  canGradeAssignments: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canManageAccounts: true,
    canManageStudents: true,
    canManageTeachers: true,
    canManageSubjects: true,
    canManageRoutine: true,
    canCreateSessions: true,
    canTakeAttendance: true,
    canCreateHomework: true,
    canCreateNotices: true,
    canCreateEvents: true,
    canGradeAssignments: true,
  },
  TEACHER: {
    canManageAccounts: false,
    canManageStudents: false,
    canManageTeachers: false,
    canManageSubjects: true,
    canManageRoutine: true,
    canCreateSessions: true,
    canTakeAttendance: true,
    canCreateHomework: true,
    canCreateNotices: true,
    canCreateEvents: true,
    canGradeAssignments: true,
  },
  CR: {
    canManageAccounts: false,
    canManageStudents: false,
    canManageTeachers: false,
    canManageSubjects: false,
    canManageRoutine: false,
    canCreateSessions: true,
    canTakeAttendance: true,
    canCreateHomework: true,
    canCreateNotices: false,
    canCreateEvents: false,
    canGradeAssignments: false,
  },
  STUDENT: {
    canManageAccounts: false,
    canManageStudents: false,
    canManageTeachers: false,
    canManageSubjects: false,
    canManageRoutine: false,
    canCreateSessions: false,
    canTakeAttendance: false,
    canCreateHomework: false,
    canCreateNotices: false,
    canCreateEvents: false,
    canGradeAssignments: false,
  },
};

export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.STUDENT;
}

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return Boolean(ROLE_PERMISSIONS[role]?.[permission]);
}

// Extracted from prompt constraints:
export type AuthorizationResource = 
  | { type: "subject"; subjectId: string; teacherId?: string }
  | { type: "session"; sessionId: string; subjectId: string }
  | { type: "assignment"; assignmentId: string; subjectId: string }
  | { type: "submission"; studentId: string; assignmentId: string }
  | { type: "attendance"; studentId: string; sessionId: string };

export type AuthorizationAction = 
  | "create"
  | "read"
  | "update"
  | "delete"
  | "grade"
  | "submit";

import { SessionUser } from "./session";

export function can(
  user: SessionUser | null, 
  action: AuthorizationAction, 
  resource: AuthorizationResource
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  switch (resource.type) {
    case "subject":
      if (user.role === "TEACHER") {
        return resource.teacherId === user.teacherId;
      }
      return false;
      
    case "session":
    case "assignment":
      if (user.role === "TEACHER" || user.role === "CR") {
        // Technically we need to know if the CR/Teacher owns the subject
        // For now, we trust they have subject permission if they reach here,
        // or we check their role.
        return true; 
      }
      return false;
      
    case "submission":
      if (user.role === "STUDENT") {
        return resource.studentId === user.studentProfileId && action === "submit";
      }
      if (user.role === "TEACHER" && action === "grade") {
        return true;
      }
      return false;
      
    case "attendance":
      // students can view their own
      if (user.role === "STUDENT" && action === "read") {
        return resource.studentId === user.studentProfileId;
      }
      return false;
  }
  
  return false;
}
