import { db } from "@/db";
import { students } from "@/db/schema";
import { asc } from "drizzle-orm";
import { cookies } from "next/headers";

export async function getCurrentRole() {
  const cookieStore = await cookies();
  const role = cookieStore.get("APP_ROLE")?.value;
  
  if (role === "STUDENT") return "STUDENT";
  if (role === "ADMIN") return "ADMIN";
  
  const envRole = process.env.APP_ROLE;
  return envRole === "STUDENT" ? "STUDENT" : "ADMIN";
}

export async function getPermissions() {
  const role = await getCurrentRole();
  const isStudent = role === "STUDENT";

  return {
    canManageStudents: !isStudent,
    canManageRoutine: !isStudent,
    canCreateSessions: !isStudent,
    canTakeAttendance: !isStudent,
    canCreateHomework: !isStudent,
    canCreateNotices: !isStudent,
    canCreateEvents: !isStudent,
    canManageTeachers: !isStudent,
    canManageSubjects: !isStudent,
  };
}

// Resolver for finding the contextual student in the dashboard
export async function resolveCurrentStudent() {
  const envStudentId = process.env.DEMO_STUDENT_ID ?? null;

  if (envStudentId) {
    const student = await db.query.students.findFirst({
      where: (s, { eq }) => eq(s.id, envStudentId),
    });
    if (student) return student;
  }

  // Fallback: Pick the first student alphabetically
  const fallbackStudent = await db.query.students.findFirst({
    orderBy: [asc(students.name)],
  });

  return fallbackStudent ?? null;
}
