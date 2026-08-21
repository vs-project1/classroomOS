import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, studentProfiles, students, teachers, sessions } from "@/db/schema";
import { createSessionToken, verifySessionToken, getSessionTokenId } from "./token";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
  mustChangePassword: boolean;
  isActive: boolean;
  studentProfileId?: string;
  teacherId?: string;
}

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

/**
 * Creates an active session for a user and sets the HTTP-only cookie.
 */
export async function createSession(
  userId: string,
  role?: "ADMIN" | "TEACHER" | "CR" | "STUDENT",
  mustChangePassword?: boolean
): Promise<string> {
  let resolvedRole = role;
  let resolvedMustChange = mustChangePassword;

  if (!resolvedRole || resolvedMustChange === undefined) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    resolvedRole = user.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT";
    resolvedMustChange = Boolean(user.mustChangePassword);
  }

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = createSessionToken({
    userId,
    role: resolvedRole,
    mustChangePassword: resolvedMustChange,
    expiresAt,
  });

  // Persist the hashed token id so the session can be revoked server-side.
  await db.insert(sessions).values({
    id: getSessionTokenId(token),
    userId,
    expiresAt: new Date(expiresAt),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });

  return token;
}

/**
 * Helper to resolve test fixture persona when running in non-production.
 */
async function resolveTestFixturePersona(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<SessionUser | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const appRole = cookieStore.get("APP_ROLE")?.value;
  const demoStudentId = cookieStore.get("DEMO_STUDENT_ID")?.value;

  if (!appRole && !demoStudentId) {
    return null;
  }

  // 1. Try resolving via DEMO_STUDENT_ID
  if (demoStudentId) {
    // Specific known test personas
    if (demoStudentId === "sp_newstudent_001" || demoStudentId.includes("newstudent")) {
      const user = await db.query.users.findFirst({
        where: eq(users.email, "newstudent@classroom.edu.np"),
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: "Roshani Shrestha",
          role: "STUDENT",
          mustChangePassword: true,
          isActive: Boolean(user.isActive),
          studentProfileId: "sp_newstudent_001",
        };
      }
    }

    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, demoStudentId),
    });

    if (profile) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, profile.userId),
      });

      if (user && user.isActive) {
        const student = await db.query.students.findFirst({
          where: eq(students.rollNumber, profile.rollNumber),
        });

        return {
          id: user.id,
          email: user.email,
          name: student?.name || user.email.split("@")[0],
          role: user.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
          mustChangePassword: Boolean(user.mustChangePassword),
          isActive: Boolean(user.isActive),
          studentProfileId: profile.id,
        };
      }
    }
  }

  // 2. Try resolving via APP_ROLE
  if (appRole) {
    if (appRole === "ADMIN") {
      const adminUser = await db.query.users.findFirst({
        where: eq(users.role, "ADMIN"),
      });
      if (adminUser) {
        return {
          id: adminUser.id,
          email: adminUser.email,
          name: "System Administrator",
          role: "ADMIN",
          mustChangePassword: Boolean(adminUser.mustChangePassword),
          isActive: Boolean(adminUser.isActive),
        };
      }
    }

    if (appRole === "TEACHER") {
      const teacherUser = await db.query.users.findFirst({
        where: eq(users.role, "TEACHER"),
      });
      if (teacherUser) {
        const teacher = await db.query.teachers.findFirst({
          where: eq(teachers.email, teacherUser.email),
        });
        return {
          id: teacherUser.id,
          email: teacherUser.email,
          name: teacher?.name || teacherUser.email.split("@")[0],
          role: "TEACHER",
          mustChangePassword: Boolean(teacherUser.mustChangePassword),
          isActive: Boolean(teacherUser.isActive),
          teacherId: teacher?.id,
        };
      }
    }

    if (appRole === "CR") {
      const crUser = await db.query.users.findFirst({
        where: eq(users.role, "CR"),
      });
      if (crUser) {
        const profile = await db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.userId, crUser.id),
        });
        const student = profile ? await db.query.students.findFirst({
          where: eq(students.rollNumber, profile.rollNumber),
        }) : null;
        return {
          id: crUser.id,
          email: crUser.email,
          name: student?.name || crUser.email.split("@")[0],
          role: "CR",
          mustChangePassword: Boolean(crUser.mustChangePassword),
          isActive: Boolean(crUser.isActive),
          studentProfileId: profile?.id,
        };
      }
    }

    if (appRole === "STUDENT") {
      const studentUser = await db.query.users.findFirst({
        where: eq(users.role, "STUDENT"),
      });
      if (studentUser) {
        const profile = await db.query.studentProfiles.findFirst({
          where: eq(studentProfiles.userId, studentUser.id),
        });
        const student = profile ? await db.query.students.findFirst({
          where: eq(students.rollNumber, profile.rollNumber),
        }) : null;
        return {
          id: studentUser.id,
          email: studentUser.email,
          name: student?.name || studentUser.email.split("@")[0],
          role: "STUDENT",
          mustChangePassword: Boolean(studentUser.mustChangePassword),
          isActive: Boolean(studentUser.isActive),
          studentProfileId: profile?.id,
        };
      }
    }
  }

  return null;
}

/**
 * Retrieves the authenticated session user, resolving student/teacher profiles.
 * In non-production, falls back to test fixture personas if mock cookies are present.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return await resolveTestFixturePersona(cookieStore);
  }

  const payload = verifySessionToken(rawToken);
  if (!payload) {
    return await resolveTestFixturePersona(cookieStore);
  }

  // Revocation check: the token must map to a live, unexpired session row.
  // Hard-deny (no fixture fallback) so evicted sessions stay evicted.
  const sessionRow = await db.query.sessions.findFirst({
    where: eq(sessions.id, getSessionTokenId(rawToken)),
  });

  if (!sessionRow || sessionRow.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });

  if (!user || !user.isActive) {
    return null;
  }

  let name = user.email.split("@")[0];
  let studentProfileId: string | undefined;
  let teacherId: string | undefined;

  if (user.role === "STUDENT" || user.role === "CR") {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, user.id),
    });
    if (profile) {
      studentProfileId = profile.id;
      const student = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      if (student?.name) {
        name = student.name;
      }
    }
  } else if (user.role === "TEACHER") {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.email, user.email),
    });
    if (teacher) {
      teacherId = teacher.id;
      name = teacher.name;
    }
  } else if (user.role === "ADMIN") {
    name = "System Administrator";
  }

  return {
    id: user.id,
    email: user.email,
    name,
    role: user.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
    mustChangePassword: Boolean(user.mustChangePassword),
    isActive: Boolean(user.isActive),
    studentProfileId,
    teacherId,
  };
}

/**
 * Enforces server-side authentication assertion.
 * If not authenticated, redirects to /login.
 * If mustChangePassword is true, redirects to /change-password.
 * If allowedRoles specified and user role is not permitted, redirects safely.
 */
export async function requireAuth(allowedRoles?: string[]): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.isActive) {
    redirect("/login?error=deactivated");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === "TEACHER") {
      redirect("/teacher");
    } else if (user.role === "CR") {
      redirect("/cr");
    } else if (user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/");
    }
  }

  return user;
}

/**
 * Revokes every active session for a user by deleting their session rows.
 * Called on password reset/change and account deactivation.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Invalidates the current session by deleting its server-side row (if any)
 * and clearing the auth cookie.
 */
export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken && verifySessionToken(rawToken)) {
    await db
      .delete(sessions)
      .where(eq(sessions.id, getSessionTokenId(rawToken)));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("APP_ROLE");
  cookieStore.delete("DEMO_STUDENT_ID");
}
