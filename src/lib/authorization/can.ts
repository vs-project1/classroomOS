import { SessionUser } from "@/lib/auth/session";

export type CapabilityAction =
  | "assignment.submit"
  | "assignment.grade"
  | "attendance.edit"
  | "attendance.dispute"
  | "resource.upload"
  | "student.view"
  | "session.create"
  | "notice.create"
  | "event.create";

export type AssignmentResource = { type: "assignment", id: string };
export type SubmissionResource = { type: "submission", teacherId?: string | null };
export type AttendanceResource = { type: "attendance", studentId?: string };
export type SessionResource = { type: "session", id: string };
export type SubjectResource = { type: "subject", id: string };
export type StudentResource = { type: "student", id: string };

export type AuthorizationResource =
  | AssignmentResource
  | SubmissionResource
  | AttendanceResource
  | SessionResource
  | SubjectResource
  | StudentResource;

export async function can(
  user: SessionUser,
  action: CapabilityAction,
  resource?: AuthorizationResource
): Promise<boolean> {
  if (!user || !user.isActive) return false;
  if (user.role === "ADMIN") return true;

  switch (action) {
    case "assignment.submit":
      return user.role === "STUDENT" || user.role === "CR";
    case "assignment.grade":
      if (resource?.type !== "submission") return false;
      return user.role === "TEACHER" && (!resource.teacherId || resource.teacherId === user.teacherId);
    case "attendance.edit":
      return user.role === "TEACHER" || user.role === "CR";
    case "attendance.dispute":
      if (resource?.type !== "attendance") return false;
      return (user.role === "STUDENT" || user.role === "CR") && (!resource.studentId || resource.studentId === user.id);
    case "resource.upload":
      return user.role === "TEACHER";
    case "session.create":
      return user.role === "TEACHER" || user.role === "CR";
    case "notice.create":
    case "event.create":
      return user.role === "TEACHER";
    default:
      return false;
  }
}
