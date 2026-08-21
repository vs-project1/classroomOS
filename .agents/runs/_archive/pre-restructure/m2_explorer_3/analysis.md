# Architectural & Technical Specification: Admin Accounts Console & Server Actions

**Author**: `m2_explorer_3` (Admin Accounts Console & Server Actions Explorer)  
**Milestone**: Milestone 2 (Auth, Security, RBAC & Admin Accounts)  
**Target Route**: `/admin/accounts`  
**Target Action Module**: `src/app/actions/accounts.ts`  
**Date**: 2026-08-16  

---

## 1. Executive Summary & Architectural Scope

In Classroom OS, there is **strictly no public user registration**. All accounts (`STUDENT`, `TEACHER`, `CR`, `ADMIN`) must be explicitly provisioned by a system administrator. The **Admin Accounts Console (`/admin/accounts`)** acts as the central command center for user identity lifecycle management, enabling administrators to:
1. **List, Search, and Filter** all institutional accounts across roles and active/deactivated statuses.
2. **Inspect KPI metrics** for roster composition (Total Accounts, Active Students, Active Teachers, Class Representatives, Deactivated Accounts).
3. **Provision new accounts** with auto-generated memorable temporary passwords and 1-click clipboard copying.
4. **Enforce password quarantine**: Newly created or reset accounts have `mustChangePassword = 1`, forcing a password reset on first login.
5. **Manage Account Lifecycle**: Instantly toggle account active status (with self-deactivation protection for administrators) and trigger temporary password resets.
6. **Maintain Multi-Table Academic Integrity**: Atomically sync authentication identity (`users` table) with academic profile records (`student_profiles` and `students` or `teachers` table).

---

## 2. Entity Model & Relationship Mapping

The database schema (`src/db/schema.ts`) separates authentication credentials from academic domain profiles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              users Table                               │
│  - id: text (PK)                                                       │
│  - email: text (UNIQUE)                                                │
│  - passwordHash: text ("<salt>:<scrypt_derived_key_hex>")              │
│  - role: 'ADMIN' | 'TEACHER' | 'CR' | 'STUDENT'                        │
│  - mustChangePassword: boolean (default: true)                         │
│  - isActive: boolean (default: true)                                   │
│  - createdAt: timestamp                                                │
│  - updatedAt: timestamp                                                │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         │ 1:1 (user_id FK)                                  │ 1:1 (by email)
         ▼                                                   ▼
┌───────────────────────────────────┐               ┌───────────────────────────────────┐
│       student_profiles Table      │               │          teachers Table           │
│  - id: text (PK)                  │               │  - id: text (PK)                  │
│  - userId: text (FK -> users.id)  │               │  - name: text                     │
│  - rollNumber: text (UNIQUE)      │               │  - email: text (UNIQUE)           │
│  - faculty: text ('BCA', etc.)    │               │  - phone: text                    │
│  - semester: integer (1 - 8)      │               │  - faculties: text[] (JSON)       │
│  - section: text ('A', 'B')       │               │  - semesters: text[] (JSON)       │
│  - batchYear: integer (2024)      │               └───────────────────────────────────┘
│  - phone: text                    │
└────────────────┬──────────────────┘
                 │ (by rollNumber / email)
                 ▼
┌───────────────────────────────────┐
│          students Table           │
│  - id: text (PK)                  │
│  - name: text                     │
│  - rollNumber: text (UNIQUE)      │
│  - email: text (UNIQUE)           │
│  - phone: text                    │
│  - faculty: text                  │
│  - semester: text                 │
└───────────────────────────────────┘
```

### Mutation Invariant for Provisioning:
1. When provisioning a **Student** or **CR**:
   - Insert into `users` (`id`, `email`, `passwordHash`, `role`, `mustChangePassword = true`, `isActive = true`).
   - Insert into `students` (`id`, `name`, `rollNumber`, `email`, `phone`, `faculty`, `semester`).
   - Insert into `student_profiles` (`id`, `userId`, `rollNumber`, `faculty`, `semester` as integer, `section`, `batchYear`, `phone`).
2. When provisioning a **Teacher**:
   - Insert into `users` (`id`, `email`, `passwordHash`, `role: "TEACHER"`, `mustChangePassword = true`, `isActive = true`).
   - Insert into `teachers` (`id`, `name`, `email`, `phone`, `faculties`, `semesters`).

---

## 3. UI Component Architecture (`/admin/accounts`)

### 3.1 File Structure
```
src/app/(admin)/admin/accounts/
├── page.tsx                           # Server Component: RBAC guard, parallel data fetch, KPI calculation
├── accounts-client-console.tsx        # Client Component: State for search, filters, dialogs
├── kpi-summary-cards.tsx              # 5 KPI cards (Total, Students, Teachers, CRs, Deactivated)
├── accounts-table.tsx                 # Roster table with role badges, status switch, row actions
├── create-account-dialog.tsx          # Creation modal with dynamic role fields & temp pass generator
├── credentials-dialog.tsx             # Post-creation credentials modal with 1-click clipboard copy
├── edit-account-dialog.tsx            # Modal to update user metadata
├── reset-password-dialog.tsx          # Confirmation modal for password reset
└── actions.ts                         # Re-export from @/app/actions/accounts for localized ergonomics
```

### 3.2 Page Layout Blueprint (`src/app/(admin)/admin/accounts/page.tsx`)

```tsx
import { db } from "@/db";
import { users, students, teachers, studentProfiles } from "@/db/schema";
import { desc, asc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth"; // Auth service
import { AccountsClientConsole } from "./accounts-client-console";

export const dynamic = "force-dynamic";

export interface EnrichedAccount {
  id: string; // user id
  email: string;
  role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  phone?: string | null;
  // Student Metadata
  rollNumber?: string | null;
  faculty?: string | null;
  semester?: number | string | null;
  section?: string | null;
  batchYear?: number | null;
  studentId?: string | null;
  // Teacher Metadata
  teacherId?: string | null;
  faculties?: string[] | null;
  semesters?: string[] | null;
}

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
      const matchTeacher = allTeachers.find((t) => t.email?.toLowerCase() === u.email.toLowerCase());
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
        (s) => s.email?.toLowerCase() === u.email.toLowerCase() || (u.studentProfile && s.rollNumber === u.studentProfile.rollNumber)
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
      role: u.role as any,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
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
    activeStudents: accounts.filter((a) => (a.role === "STUDENT" || a.role === "CR") && a.isActive).length,
    activeTeachers: accounts.filter((a) => a.role === "TEACHER" && a.isActive).length,
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
```

---

## 4. KPI Summary Cards Specification

The KPI strip renders 5 compact metric cards styled with institutional typography:

| Metric Card | Target Calculation | Icon | Badge / Theme | Description |
|---|---|---|---|---|
| **Total Accounts** | `accounts.length` | `Users` | Neutral / Foreground | Total registered auth identities in the database |
| **Active Students** | `role IN ('STUDENT', 'CR') AND isActive` | `GraduationCap` | Sky / Blue | Enrolled scholars with active login privileges |
| **Active Teachers** | `role = 'TEACHER' AND isActive` | `BookOpen` | Royal Blue | Faculty members with grading & session logging rights |
| **Class Reps (CRs)** | `role = 'CR' AND isActive` | `ShieldCheck` | Emerald Green | Student leaders with delegated session log permissions |
| **Deactivated** | `isActive = false` | `UserX` / `AlertTriangle` | Rose / Destructive | Suspended or deactivated credentials |

---

## 5. Playwright E2E Locator & DOM Contract

To guarantee seamless integration with `tests/e2e/auth-lifecycle.spec.ts` and `tests/fixtures/pom/admin-accounts.page.ts`, the console components **must** satisfy these exact DOM selectors:

| Page Object Property | Required Locator / Selector | Implementation in Component |
|---|---|---|
| `createAccountButton` | `button.filter({ hasText: /Create Account\|Add User\|New Account/i })` | `<Button onClick={() => setCreateOpen(true)}>Create Account</Button>` |
| `searchInput` | `input[placeholder*='Search'], input[type='search']` | `<Input type="search" placeholder="Search by name, email, roll number..." value={search} onChange={...} />` |
| `roleFilterSelect` | `select[name='roleFilter'], [role='combobox']` filtered by `/Role\|All/i` | `<select name="roleFilter" value={roleFilter} onChange={...}><option value="ALL">All Roles</option>...</select>` |
| `accountsTable` | `table` | `<table className="w-full text-sm text-left">...</table>` |
| `nameInput` | `input[name='name'], #name` | `<Input id="name" name="name" placeholder="e.g. Aayush Shrestha" required />` |
| `emailInput` | `input[name='email'], #email` | `<Input id="email" name="email" type="email" placeholder="e.g. aayush@classroom.edu.np" required />` |
| `roleSelect` | `select[name='role'], #role` | `<select id="role" name="role" defaultValue="STUDENT">...</select>` |
| `rollNumberInput` | `input[name='rollNumber'], #rollNumber` | `<Input id="rollNumber" name="rollNumber" placeholder="e.g. BCA-2024-042" required />` |
| `facultySelect` | `select[name='faculty'], input[name='faculty'], #faculty` | `<select id="faculty" name="faculty" defaultValue="BCA"><option value="BCA">BCA</option>...</select>` |
| `semesterSelect` | `select[name='semester'], input[name='semester'], #semester` | `<select id="semester" name="semester" defaultValue="4th"><option value="4th">4th Semester</option>...</select>` |
| `sectionInput` | `input[name='section'], #section` | `<Input id="section" name="section" defaultValue="A" />` |
| `submitModalButton` | `button[type='submit'].filter({ hasText: /Create\|Save\|Add/i })` | `<Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create Account"}</Button>` |
| `tempPasswordDialog` | `[role='dialog'].filter({ hasText: /Credentials\|Temporary Password\|Created/i })` | `<Dialog open={credOpen}><DialogContent><DialogTitle>Account Created — Temporary Credentials</DialogTitle>...</DialogContent></Dialog>` |
| `tempPasswordText` | `[data-testid='temp-password-value'], code, [data-temp-password]` | `<code data-testid="temp-password-value" data-temp-password className="...">TempPass#2026</code>` |
| `copyCredentialsButton` | `button.filter({ hasText: /Copy Credentials\|Copy Password\|Copy/i })` | `<Button onClick={copyToClipboard}>Copy Credentials</Button>` |

---

## 6. Temporary Password Generator Algorithm

Temporary passwords must:
1. Satisfy min-8-character policy.
2. Contain uppercase, lowercase, numbers, and special symbols.
3. Be pronounceable and easily readable over phone/in-person.

```typescript
const CAMPUS_WORDS = [
  "Kathmandu", "Patan", "Bhaktapur", "Pokhara", 
  "Lumbini", "Everest", "Himalaya", "Gorkha",
  "Janakpur", "Mustang", "Annapurna", "Chitwan",
  "Tribhuvan", "Campus", "Scholar", "Classroom"
];
const SYMBOLS = ["#", "!", "@", "$", "&"];

export function generateMemorablePassword(): string {
  const word = CAMPUS_WORDS[Math.floor(Math.random() * CAMPUS_WORDS.length)];
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const year = new Date().getFullYear();
  return `${word}${symbol}${year}`;
}
```
*Examples*: `Kathmandu#2026`, `Everest!2026`, `Tribhuvan#2026`.

---

## 7. Server Actions Specification (`src/app/actions/accounts.ts`)

```typescript
"use server";

import { db } from "@/db";
import { users, students, studentProfiles, teachers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth"; // From M2 auth service

// Standard action state response
export type AccountActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  credentials?: {
    name: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
    temporaryPassword: string;
  };
};

// Password hashing standard compatible with seed.ts
export function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Normalizer for semester inputs (handles "4th", 4, "IV", "4th Semester")
export function normalizeSemester(input: string | number | undefined): { intVal: number; strVal: string } {
  if (typeof input === "number") {
    const clamped = Math.max(1, Math.min(8, Math.floor(input)));
    return { intVal: clamped, strVal: `${clamped}${getOrdinalSuffix(clamped)} Semester` };
  }
  if (!input) return { intVal: 1, strVal: "1st Semester" };
  const clean = input.trim();
  const digitMatch = clean.match(/(\d+)/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    const clamped = Math.max(1, Math.min(8, num));
    return { intVal: clamped, strVal: `${clamped}${getOrdinalSuffix(clamped)} Semester` };
  }
  const romanMap: Record<string, number> = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8,
  };
  const romanVal = romanMap[clean.toLowerCase()];
  if (romanVal) {
    return { intVal: romanVal, strVal: `${romanVal}${getOrdinalSuffix(romanVal)} Semester` };
  }
  return { intVal: 1, strVal: "1st Semester" };
}

function getOrdinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

// Zod Validation Schema
const CreateAccountSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(255, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Invalid email address format"),
  role: z.enum(["ADMIN", "TEACHER", "CR", "STUDENT"]),
  phone: z.string().trim().optional().nullable(),
  temporaryPassword: z.string().optional(),
  // Student specific
  rollNumber: z.string().trim().optional(),
  faculty: z.string().trim().optional(),
  semester: z.string().trim().optional(),
  section: z.string().trim().optional(),
  batchYear: z.coerce.number().optional(),
  // Teacher specific
  faculties: z.array(z.string()).optional(),
  semesters: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.role === "STUDENT" || data.role === "CR") {
    if (!data.rollNumber || data.rollNumber.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rollNumber"],
        message: "Roll number is required for students",
      });
    }
  }
});

// 1. Create Account Action
export async function createAccountAction(
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  // Check Admin Authorization
  try {
    await requireAuth(["ADMIN"]);
  } catch (err) {
    return { success: false, message: "Unauthorized. Admin role required." };
  }

  const rawFaculties = formData.getAll("faculties").map(String);
  const rawSemesters = formData.getAll("semesters").map(String);

  const parsed = CreateAccountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    temporaryPassword: formData.get("temporaryPassword") || undefined,
    rollNumber: formData.get("rollNumber") || undefined,
    faculty: formData.get("faculty") || undefined,
    semester: formData.get("semester") || undefined,
    section: formData.get("section") || undefined,
    batchYear: formData.get("batchYear") || undefined,
    faculties: rawFaculties.length > 0 ? rawFaculties : undefined,
    semesters: rawSemesters.length > 0 ? rawSemesters : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Please correct the highlighted form errors.",
    };
  }

  const data = parsed.data;
  const tempPassword = data.temporaryPassword && data.temporaryPassword.length >= 8
    ? data.temporaryPassword
    : `TempPass#${new Date().getFullYear()}`;

  const hashedPass = hashPassword(tempPassword);
  const userId = `usr_${crypto.randomUUID()}`;

  try {
    // 1. Insert into users table
    await db.insert(users).values({
      id: userId,
      email: data.email,
      passwordHash: hashedPass,
      role: data.role,
      mustChangePassword: true, // Force quarantine on first login
      isActive: true,
    });

    // 2. Insert role-specific profile records
    if (data.role === "STUDENT" || data.role === "CR") {
      const studentId = `std_${crypto.randomUUID()}`;
      const profileId = `sp_${crypto.randomUUID()}`;
      const semNorm = normalizeSemester(data.semester);
      const faculty = data.faculty || "BCA";
      const section = data.section || "A";
      const batchYear = data.batchYear || new Date().getFullYear();

      // Insert academic student record
      await db.insert(students).values({
        id: studentId,
        name: data.name,
        rollNumber: data.rollNumber!,
        email: data.email,
        phone: data.phone || null,
        faculty,
        semester: semNorm.strVal,
      });

      // Insert 1:1 student profile linking userId
      await db.insert(studentProfiles).values({
        id: profileId,
        userId,
        rollNumber: data.rollNumber!,
        faculty,
        semester: semNorm.intVal,
        section,
        batchYear,
        phone: data.phone || null,
      });
    } else if (data.role === "TEACHER") {
      const teacherId = `tch_${crypto.randomUUID()}`;
      await db.insert(teachers).values({
        id: teacherId,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        faculties: data.faculties && data.faculties.length > 0 ? data.faculties : ["BCA"],
        semesters: data.semesters && data.semesters.length > 0 ? data.semesters : ["4th Semester"],
      });
    }

    revalidatePath("/admin/accounts");
    revalidatePath("/admin/students");
    revalidatePath("/admin/teachers");

    return {
      success: true,
      message: `Account for ${data.name} created successfully!`,
      credentials: {
        name: data.name,
        email: data.email,
        role: data.role,
        temporaryPassword: tempPassword,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      if (error.message.includes("users.email") || error.message.includes("students.email") || error.message.includes("teachers.email")) {
        return { success: false, message: "A user with this email address already exists." };
      }
      if (error.message.includes("roll_number")) {
        return { success: false, message: "A student with this roll number already exists." };
      }
      return { success: false, message: "Unique constraint violation: record already exists." };
    }
    console.error("Failed to create account:", error);
    return { success: false, message: "An unexpected error occurred while creating the account." };
  }
}

// 2. Toggle Account Status Action (Activate / Deactivate)
export async function toggleAccountStatusAction(userId: string): Promise<AccountActionState> {
  const currentAdmin = await requireAuth(["ADMIN"]);

  // Self-protection check
  if (userId === currentAdmin.id) {
    return { success: false, message: "Cannot deactivate your own active administrator account." };
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    return { success: false, message: "User account not found." };
  }

  const newStatus = !targetUser.isActive;

  try {
    await db.update(users).set({
      isActive: newStatus,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    revalidatePath("/admin/accounts");
    return {
      success: true,
      message: `Account ${targetUser.email} has been ${newStatus ? "activated" : "deactivated"}.`,
    };
  } catch (error) {
    console.error("Failed to toggle status:", error);
    return { success: false, message: "Failed to update account status." };
  }
}

// 3. Reset Password Action
export async function resetPasswordAction(userId: string): Promise<AccountActionState> {
  await requireAuth(["ADMIN"]);

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    return { success: false, message: "User account not found." };
  }

  const newTempPassword = `TempPass#${Math.floor(1000 + Math.random() * 9000)}`;
  const hashed = hashPassword(newTempPassword);

  try {
    await db.update(users).set({
      passwordHash: hashed,
      mustChangePassword: true, // Quarantine flag set
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    revalidatePath("/admin/accounts");
    return {
      success: true,
      message: "Temporary password generated successfully!",
      credentials: {
        name: targetUser.email.split("@")[0],
        email: targetUser.email,
        role: targetUser.role as any,
        temporaryPassword: newTempPassword,
      },
    };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, message: "Failed to reset password." };
  }
}

// 4. Update Account Metadata Action
export async function updateAccountAction(
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  await requireAuth(["ADMIN"]);

  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const rollNumber = formData.get("rollNumber") as string;
  const faculty = formData.get("faculty") as string;
  const semester = formData.get("semester") as string;
  const section = formData.get("section") as string;

  if (!userId || !email || !name) {
    return { success: false, message: "Missing required fields." };
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return { success: false, message: "User not found." };
    }

    // Update users email
    await db.update(users).set({
      email: email.trim().toLowerCase(),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    if (targetUser.role === "STUDENT" || targetUser.role === "CR") {
      const semNorm = normalizeSemester(semester);
      // Update student profiles
      await db.update(studentProfiles).set({
        rollNumber: rollNumber || undefined,
        faculty: faculty || undefined,
        semester: semNorm.intVal,
        section: section || undefined,
        phone: phone || null,
        updatedAt: new Date(),
      }).where(eq(studentProfiles.userId, userId));

      // Update student table by email match
      await db.update(students).set({
        name,
        rollNumber: rollNumber || undefined,
        faculty: faculty || undefined,
        semester: semNorm.strVal,
        phone: phone || null,
      }).where(eq(students.email, targetUser.email));
    } else if (targetUser.role === "TEACHER") {
      await db.update(teachers).set({
        name,
        phone: phone || null,
        updatedAt: new Date(),
      }).where(eq(teachers.email, targetUser.email));
    }

    revalidatePath("/admin/accounts");
    revalidatePath("/admin/students");
    revalidatePath("/admin/teachers");

    return { success: true, message: "Account details updated successfully!" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "Another user already possesses this email or roll number." };
    }
    console.error("Failed to update account:", error);
    return { success: false, message: "Failed to update account." };
  }
}
```

---

## 8. Client Components & UX Flow

### 8.1 State Management in `AccountsClientConsole`
```typescript
interface AccountsClientConsoleProps {
  accounts: EnrichedAccount[];
  kpiStats: {
    totalAccounts: number;
    activeStudents: number;
    activeTeachers: number;
    crs: number;
    deactivated: number;
  };
  currentUserId: string;
}
```
- `search`: string filter across `name`, `email`, `rollNumber`.
- `roleFilter`: `'ALL' | 'STUDENT' | 'TEACHER' | 'CR' | 'ADMIN'`.
- `statusFilter`: `'ALL' | 'ACTIVE' | 'DEACTIVATED'`.
- `createdCredentials`: `{ name, email, role, temporaryPassword } | null` (triggers `CredentialsDialog`).
- `editUser`: `EnrichedAccount | null` (triggers `EditAccountDialog`).
- Filter predicate:
  ```typescript
  const filteredAccounts = accounts.filter((acc) => {
    if (roleFilter !== "ALL" && acc.role !== roleFilter) return false;
    if (statusFilter === "ACTIVE" && !acc.isActive) return false;
    if (statusFilter === "DEACTIVATED" && acc.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = acc.name.toLowerCase().includes(q);
      const matchEmail = acc.email.toLowerCase().includes(q);
      const matchRoll = acc.rollNumber?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll) return false;
    }
    return true;
  });
  ```

### 8.2 Credentials Dialog Flow (`credentials-dialog.tsx`)
1. User clicks "Create Account" -> enters details -> submits form.
2. Server action responds with `{ success: true, credentials: { ... } }`.
3. Modal automatically renders credentials:
   - Full Name, Email, Role badge.
   - High-contrast temporary password in monospace font with `data-testid="temp-password-value"` and `data-temp-password`.
   - Single-click "Copy Credentials" button (`navigator.clipboard.writeText(...)`).
   - Reassurance alert: *"Quarantine Flag Active: User will be forced to change this password on initial sign-in."*

---

## 9. Boundary Value Analysis & Edge Case Safeguards

| Scenario / Edge Case | Test Reference | Safeguard / Resolution |
|---|---|---|
| Duplicate email inserted | `TC-BVA-F5-01` | SQLite UNIQUE constraint caught in action -> returns `"A user with this email address already exists."` |
| Duplicate roll number inserted | `TC-BVA-F5-02` | SQLite UNIQUE constraint on `student_profiles.roll_number` caught -> returns `"A student with this roll number already exists."` |
| Admin deactivating self | `TC-BVA-F8-04` | Action checks `userId === currentAdmin.id` -> returns `"Cannot deactivate your own active administrator account."` |
| Student accessing `/admin/accounts` | `TC-SPEC-AUTH-12` | `requireAuth(["ADMIN"])` redirects or returns 403 Forbidden |
| Deactivated account login | `TC-SPEC-AUTH-13` | Auth login action verifies `user.isActive === true`; returns `"Account is deactivated"` |
| Regex search chars (`.*+?^$`) | `TC-BVA-F8-02` | Search uses literal `String.prototype.includes()` in lowercase, avoiding RegExp parse crashes |
| Semester string variants (`"4th"`, `"IV"`, `4`) | `TC-BVA-F1-02` | `normalizeSemester()` parses integers, Roman numerals, and ordinals into integer `1..8` for `student_profiles` and text for `students` |
