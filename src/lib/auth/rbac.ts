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
    canCreateNotices: false,
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

