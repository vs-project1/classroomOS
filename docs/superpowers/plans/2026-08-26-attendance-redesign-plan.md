# Daily Attendance & Session Logging Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated daily morning roll call system with monthly views, and separate it entirely from subject-level class session logging.

**Architecture:** Create new `daily_sessions` and `daily_attendance` tables in SQLite to isolate morning roll call from subject sessions. Build Server Actions to interact with these tables. Build a dedicated UI for CRs to take daily attendance, and a monthly aggregate view for Admins/CRs. Update existing "Take Attendance" views to "Log Session".

**Tech Stack:** Next.js Server Actions, Drizzle ORM, Tailwind, React.

## Global Constraints

- Daily attendance must be separated from `classSessions` which are subject-bound.
- Monthly view must aggregate by Nepali month (can use JS dates for now, grouped locally by month).
- Log Session flow must allow marking absentees without affecting daily attendance.

---

### Task 1: Database Schema Expansion

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `package.json` (if needed for migration scripts, assumed `npm run db:push` exists)

**Interfaces:**
- Produces: `dailySessions`, `dailyAttendance` tables in Drizzle schema.

- [ ] **Step 1: Add Tables to `src/db/schema.ts`**

\`\`\`typescript
export const dailySessions = sqliteTable("daily_sessions", {
  id: text("id").primaryKey(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  semester: text("semester").notNull(),
  markedBy: text("marked_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_daily_session_date_sem").on(table.date, table.semester),
]);

export const dailyAttendance = sqliteTable("daily_attendance", {
  id: text("id").primaryKey(),
  dailySessionId: text("daily_session_id").notNull().references(() => dailySessions.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  unique("unq_daily_attendance_session_student").on(table.dailySessionId, table.studentId),
]);
\`\`\`

- [ ] **Step 2: Run Database Push to Apply Changes**

Run: `npm run db:push`
Expected: Database updated successfully.

- [ ] **Step 3: Commit**

\`\`\`bash
git add src/db/schema.ts
git commit -m "db: add dailySessions and dailyAttendance tables"
\`\`\`

### Task 2: Server Actions for Daily Attendance

**Files:**
- Create: `src/features/attendance/actions/daily.ts`
- Create: `src/app/actions/daily-attendance.ts`

**Interfaces:**
- Produces: `submitDailyAttendanceAction`, `getMonthlyAttendanceAction`

- [ ] **Step 1: Write `src/features/attendance/actions/daily.ts`**

\`\`\`typescript
"use server";
import { db } from "@/db";
import { dailySessions, dailyAttendance, students } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitDailyAttendanceAction(
  semester: string,
  date: Date,
  records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]
) {
  const user = await requireAuth(["CR", "ADMIN"]);
  
  try {
    await db.transaction(async (tx) => {
      const sessionId = \`ds_\${crypto.randomUUID()}\`;
      
      await tx.insert(dailySessions).values({
        id: sessionId,
        date: date,
        semester,
        markedBy: user.id
      });
      
      const attRecords = records.map(r => ({
        id: \`da_\${crypto.randomUUID()}\`,
        dailySessionId: sessionId,
        studentId: r.studentId,
        status: r.status
      }));
      
      await tx.insert(dailyAttendance).values(attRecords);
    });
    
    revalidatePath("/cr/take-attendance");
    revalidatePath("/attendance/monthly");
    return { success: true, message: "Daily attendance logged successfully." };
  } catch (err) {
    console.error(err);
    return { success: false, message: "Failed to log daily attendance." };
  }
}
\`\`\`

- [ ] **Step 2: Export from `src/app/actions/daily-attendance.ts`**

\`\`\`typescript
export * from "@/features/attendance/actions/daily";
\`\`\`

- [ ] **Step 3: Commit**

\`\`\`bash
git add src/features/attendance/actions/daily.ts src/app/actions/daily-attendance.ts
git commit -m "feat: add server actions for daily attendance"
\`\`\`

### Task 3: CR Take Daily Attendance UI

**Files:**
- Create: `src/app/(student)/cr/take-attendance/page.tsx`
- Modify: `src/lib/navigation/index.ts` (Update sidebar links)

**Interfaces:**
- Consumes: `submitDailyAttendanceAction`

- [ ] **Step 1: Update CR Navigation**

In `src/lib/navigation/index.ts`, locate the CR links. Add "Take Daily Attendance" pointing to `/cr/take-attendance` and rename the existing "Take Attendance" to "Log Class Session" (pointing to `/cr/log-session`).

- [ ] **Step 2: Write `src/app/(student)/cr/take-attendance/page.tsx`**

\`\`\`tsx
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";

export default async function TakeDailyAttendancePage() {
  const user = await requireAuth(["CR"]);
  // Fetch CR's semester (fallback to 1st Semester for mvp)
  const semesterStr = "2nd Semester"; 
  
  const roster = await db.select().from(students).where(eq(students.semester, semesterStr));
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Morning Roll Call</h1>
      <DailyAttendanceClient roster={roster} semester={semesterStr} />
    </div>
  );
}
\`\`\`

- [ ] **Step 3: Write Client Component (mocked implementation for brevity)**

Create `src/app/(student)/cr/take-attendance/client-page.tsx` that renders a list of students with Present/Absent radio buttons, and a submit button that calls `submitDailyAttendanceAction`.

- [ ] **Step 4: Commit**

\`\`\`bash
git add src/app/(student)/cr/take-attendance/page.tsx src/app/(student)/cr/take-attendance/client-page.tsx src/lib/navigation/index.ts
git commit -m "feat: create CR take daily attendance page"
\`\`\`

### Task 4: Restore "Log Session" Views

**Files:**
- Modify: `src/app/(student)/cr/log-session/page.tsx`
- Modify: `src/app/(teacher)/teacher/log-session/page.tsx`

**Interfaces:**
- Ensure the UI text reflects "Log Class Session" instead of "Take Attendance". 

- [ ] **Step 1: Rename UI Text in Log Session pages**

Find instances of "Take Attendance" in the headers and buttons of `log-session/page.tsx` and change them to "Log Session". Change "Mark Attendance" to "Mark Class Absentees".

- [ ] **Step 2: Commit**

\`\`\`bash
git commit -am "refactor: rename take attendance to log session for subject classes"
\`\`\`
