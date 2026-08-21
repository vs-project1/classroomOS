import { db } from "@/db";
import { users, students, teachers, studentProfiles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { AccountsClientConsole, EnrichedAccount } from "./accounts-client-console";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Management — Classroom OS Admin",
  description: "Identity management, user provisioning, and RBAC console",
};

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  // 1. RBAC Guard: Strictly require ADMIN role
  const currentUser = await requireAuth(["ADMIN"]);

  // 2. Parallel data fetching
  const [allUsers, allStudents, allTeachers] = await Promise.all([
    db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
      with: {
        studentProfile: true,
      },
    }),
    db.select().from(students),
    db.select().from(teachers),
  ]);

  // 3. Enrich user accounts with academic details
  const accounts: EnrichedAccount[] = allUsers.map((u) => {
    let name = u.email.split("@")[0];
    let phone: string | null = null;
    let rollNumber: string | null = null;
    let faculty: string | null = null;
    let semester: number | string | null = null;
    let section: string | null = null;
    let batchYear: number | null = null;
    let studentId: string | null = null;
    let teacherId: string | null = null;
    let faculties: string[] | null = null;
    let semesters: string[] | null = null;

    if (u.role === "ADMIN") {
      name = "System Administrator";
    } else if (u.role === "TEACHER") {
      const matchTeacher = allTeachers.find(
        (t) => t.email?.toLowerCase() === u.email.toLowerCase()
      );
      if (matchTeacher) {
        name = matchTeacher.name;
        phone = matchTeacher.phone;
        teacherId = matchTeacher.id;
        faculties = matchTeacher.faculties;
        semesters = matchTeacher.semesters;
      }
    } else {
      // STUDENT or CR
      const matchStudent = allStudents.find(
        (s) =>
          s.email?.toLowerCase() === u.email.toLowerCase() ||
          (u.studentProfile && s.rollNumber === u.studentProfile.rollNumber)
      );
      if (matchStudent) {
        name = matchStudent.name;
        phone = matchStudent.phone;
        studentId = matchStudent.id;
      }
      if (u.studentProfile) {
        rollNumber = u.studentProfile.rollNumber;
        faculty = u.studentProfile.faculty;
        semester = u.studentProfile.semester;
        section = u.studentProfile.section;
        batchYear = u.studentProfile.batchYear;
        if (!phone) phone = u.studentProfile.phone;
      } else if (matchStudent) {
        rollNumber = matchStudent.rollNumber;
        faculty = matchStudent.faculty;
        semester = matchStudent.semester;
      }
    }

    return {
      id: u.id,
      email: u.email,
      role: u.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      isActive: Boolean(u.isActive),
      mustChangePassword: Boolean(u.mustChangePassword),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      name,
      phone,
      rollNumber,
      faculty,
      semester,
      section,
      batchYear,
      studentId,
      teacherId,
      faculties,
      semesters,
    };
  });

  // 4. Compute KPI Metrics
  const kpiStats = {
    totalAccounts: accounts.length,
    activeStudents: accounts.filter(
      (a) => (a.role === "STUDENT" || a.role === "CR") && a.isActive
    ).length,
    activeTeachers: accounts.filter(
      (a) => a.role === "TEACHER" && a.isActive
    ).length,
    crs: accounts.filter((a) => a.role === "CR" && a.isActive).length,
    deactivated: accounts.filter((a) => !a.isActive).length,
  };

  return (
    <AccountsClientConsole
      accounts={accounts}
      kpiStats={kpiStats}
      currentUserId={currentUser.id}
    />
  );
}
