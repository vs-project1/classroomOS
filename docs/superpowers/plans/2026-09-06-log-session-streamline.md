# Log Session Streamline & Teacher Schedule Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the attendance section from the Session Logging form, upgrade the UI/UX with interactive schedule slot cards, and enforce that teacher users can only log sessions for their own scheduled classes on days when they have classes.

**Architecture:** The server routes fetch the teacher's/user's weekly routine slots alongside subjects and pass them into an upgraded `SessionForm`. The client component computes the day-of-week from the selected session date, displays clickable class cards for quick auto-fill, and blocks submission with a clear message if no classes are scheduled on that day. The server action enforces day-of-week schedule validity on the backend and records session, log, and optional homework without attendance inserts.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Drizzle ORM, Zod.

## Global Constraints
- Remove attendance section completely from session logger (do not touch CR `/cr/take-attendance` or teacher attendance rosters).
- Never break Student, CR, or Teacher role synchronization.
- Verify with `npx tsc --noEmit` ensuring a 0-error exit code.

---

### Task 1: Streamline `session-actions.ts` & Enforce Teacher Schedule Validation

**Files:**
- Modify: `src/features/sessions/actions/session-actions.ts`

**Interfaces:**
- Updates `createSession(prevState: SessionActionState, formData: FormData): Promise<SessionActionState>`

- [ ] **Step 1: Simplify SessionSchema**
Remove `attendanceJson` and `AttendanceSchema` from `SessionSchema`.

- [ ] **Step 2: Add Teacher Day-of-Week Schedule Validation**
In `createSession`:
```ts
if (user.role === "TEACHER") {
  const sessionDay = new Date(sessionDate).getDay();
  const matchingRoutine = await db.query.weeklyRoutine.findFirst({
    where: and(
      eq(weeklyRoutine.subjectId, subjectId),
      eq(weeklyRoutine.dayOfWeek, sessionDay)
    ),
  });
  if (!matchingRoutine) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
      success: false,
      message: `You do not have a scheduled class for this subject on ${days[sessionDay]}.`,
    };
  }
}
```

- [ ] **Step 3: Remove Attendance Database Inserts & Retires `getStudentsBySubject`**
In the database transaction, remove the `attendance.insert` loop. Remove the obsolete `getStudentsBySubject` export.

- [ ] **Step 4: Verify Typecheck**
Run: `npx tsc --noEmit`

---

### Task 2: Redesign `SessionForm` with Interactive Schedule Slot Selector

**Files:**
- Modify: `src/features/sessions/components/session-form.tsx`

**Interfaces:**
- Consumes: `RoutineSlotInfo[]` and `userRole`
- Produces: Upgraded `SessionForm`

- [ ] **Step 1: Update Props and State**
Add `routineSlots: RoutineSlotInfo[]` and `userRole: "ADMIN" | "TEACHER" | "CR"` to `SessionFormProps`.
Remove `attendance`, `enrolledStudents`, and `attendanceJson`.

- [ ] **Step 2: Add Dynamic Day-of-Week Slot Filtering**
Compute `currentDayOfWeek = new Date(sessionDate).getDay()`.
Filter `slotsForDay = routineSlots.filter(s => s.dayOfWeek === currentDayOfWeek)`.

- [ ] **Step 3: Build Interactive Scheduled Class Cards & Empty Alert**
Render selectable cards for each slot in `slotsForDay`.
Clicking a card auto-populates `subjectId`, `startTime`, `endTime`, and `routineId`.
If `slotsForDay.length === 0` and `userRole === "TEACHER"`:
Display alert banner: *"No classes scheduled for you on [Day of Week]. You can only log sessions on days when you have scheduled classes."* and disable submission.

- [ ] **Step 4: Clean Modernized Form Layout**
Style Topics Covered, optional Homework, and Notes with clear typography, badge indicators, and proper spacing.

- [ ] **Step 5: Verify Typecheck**
Run: `npx tsc --noEmit`

---

### Task 3: Update Route Pages to Supply Routine Slots

**Files:**
- Modify: `src/app/(student)/sessions/new/page.tsx`
- Modify: `src/app/(cr)/cr/log-session/page.tsx`

**Interfaces:**
- Supplies `routineSlots` and `userRole` to `<SessionForm />`

- [ ] **Step 1: Update `/sessions/new/page.tsx`**
Query `weeklyRoutine` slots corresponding to the user's role (assigned subjects for Teacher; enrolled subjects for CR; all for Admin) with subject relation. Pass `routineSlots` and `userRole={user.role}` to `<SessionForm />`.

- [ ] **Step 2: Update `/cr/log-session/page.tsx`**
Query `weeklyRoutine` slots for the CR's class and pass `routineSlots` and `userRole={user.role}` to `<SessionForm />`.

- [ ] **Step 3: Verify Typecheck**
Run: `npx tsc --noEmit`

---

### Task 4: Multi-Role Verification & Documentation

**Files:**
- Audit: Teacher, Student, and CR routes
- Modify: `LEARNINGS.md`

- [ ] **Step 1: Strict Typecheck Verification**
Run: `npx tsc --noEmit` with 0 errors.

- [ ] **Step 2: Independent Subagent Verification**
Dispatch `TeacherVerifier`, `CRVerifier`, and `StudentVerifier`.

- [ ] **Step 3: Document Learning**
Append Learning #20 to `LEARNINGS.md`.
