# Log Session Streamline & Teacher Schedule Constraints Design Spec

## Overview
This specification details the overhaul of the Class Session Logging feature (`/sessions/new` and `/cr/log-session`) in Classroom OS. The update:
1. Completely removes the attendance roster checklist from the session logging flow.
2. Modernizes the UI/UX with responsive, accessible cards, clear inputs, and streamlined lecture logging.
3. Enforces that `TEACHER` users can only log sessions for their own assigned classes, and only on days of the week when they have active scheduled classes in the weekly routine.
4. Gracefully handles edge cases such as weekends or off-days with an informative alert and locked submit state, while supporting dynamic date switching.

---

## User Requirements & Clarifications
- **Remove Attendance Section:** Attendance is managed through dedicated CR and Teacher attendance modules; session logging must strictly focus on academic delivery (topics covered, homework, notes).
- **Teacher Schedule Scoping:** Teachers may only log sessions for classes they teach.
- **Day-of-Week Constraint:** On any selected date, a teacher can only log sessions if they have scheduled classes on that day of the week.
- **Interactive Class Selector:** The UI displays scheduled routine class cards for the selected date, allowing one-click auto-fill of subject, start time, end time, and routine ID.
- **Edge Case (No Classes Today):** If no classes are scheduled on the selected date, show an informative alert banner and disable form submission, allowing the teacher to pick a valid past date.

---

## Architecture & Data Flow

### 1. Route Pages (`src/app/(student)/sessions/new/page.tsx` & `/cr/log-session/page.tsx`)
- Server Components query the relevant `weeklyRoutine` slots:
  ```ts
  // For TEACHER
  const routineSlots = await db.query.weeklyRoutine.findMany({
    where: inArray(weeklyRoutine.subjectId, teacherSubjectIds),
    with: { subject: true }
  });
  ```
- Passes `routineSlots`, `subjects`, and `userRole` to `<SessionForm />`.

### 2. Client Component (`src/features/sessions/components/session-form.tsx`)
- **Props:**
  ```ts
  export interface RoutineSlotInfo {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    subjectId: string;
    subject: {
      id: string;
      name: string;
      code: string;
    };
  }

  export interface SessionFormProps {
    subjects: Array<{ id: string; name: string; code: string }>;
    routineSlots: RoutineSlotInfo[];
    userRole: "ADMIN" | "TEACHER" | "CR";
    defaultValues?: {
      subjectId?: string;
      startTime?: string;
      endTime?: string;
      routineId?: string;
      sessionDate?: string;
    };
  }
  ```
- **Dynamic Date & Day Filtering:**
  - Date input defaults to Nepal date (`YYYY-MM-DD`).
  - Calculates `dayOfWeek = new Date(sessionDate).getDay()`.
  - Filters `availableSlots = routineSlots.filter(s => s.dayOfWeek === dayOfWeek)`.
- **Class Slot Cards:**
  - When `availableSlots.length > 0`: renders selectable cards with subject name, code, time range, and room. Selecting a card auto-fills `subjectId`, `startTime`, `endTime`, and `routineId`.
  - When `availableSlots.length === 0` (and `userRole === "TEACHER"`): renders an alert:
    > *"No classes scheduled for you on [Day of Week]. You can only log sessions on days when you have scheduled classes."*
    Hides/disables the submission controls.
- **Lecture Logging Fields:**
  - Topics Covered (Textarea, required).
  - Assign Homework (Optional textarea & Homework Due Date input).
  - Teacher Notes (Textarea, required).
- **Attendance Removal:**
  - Stripped `enrolledStudents`, `loadingStudents`, `attendance` state, and `attendanceJson` hidden input.

### 3. Server Action (`src/features/sessions/actions/session-actions.ts`)
- **Validation Schema:**
  - Removed `attendanceJson` and `AttendanceSchema`.
  - Validates `subjectId`, `sessionDate`, `startTime`, `endTime`, `topicsCovered`, optional `homework`, `homeworkDueDate`, `notes`, and optional `routineId`.
- **Teacher Schedule Verification:**
  - If `user.role === "TEACHER"`:
    - Verifies subject belongs to teacher (`subject.teacherId === user.teacherId`).
    - Computes `sessionDay = new Date(sessionDate).getDay()`.
    - Confirms a `weeklyRoutine` record exists for `user.teacherId` and `subjectId` on `sessionDay`.
    - If not, rejects with error: `"No scheduled class found for this subject on [Day of Week]."`.
- **Database Transaction:**
  - Inserts `classSessions`.
  - Inserts `lectureLogs`.
  - Inserts `homework` if assigned.
  - (No attendance records inserted).
- **Cache Revalidation:**
  - Revalidates `/sessions`, `/lecture-logs`, `/teacher/lecture-logs`, `/cr`, and `/`.

---

## Edge Cases & Error Handling
1. **Weekend / No Classes Scheduled:** Clear callout informing the teacher of the constraint and inviting them to pick a valid date.
2. **End Time Before Start Time:** Immediate client and server validation error.
3. **Homework Date Before Session Date:** Clear validation warning preventing impossible due dates.
4. **Non-existent Subject or Mismatched Teacher:** Handled with strict 403 authorization error.

---

## Multi-Role Invariants & Verification
- **Student & CR Daily Attendance:** Untouched. CRs still record class attendance on `/cr/take-attendance`.
- **Teacher Attendance Rosters:** Untouched. Teachers inspect student attendance percentages on `/teacher/attendance/roster`.
- **Type Safety:** 0 errors on `npx tsc --noEmit`.
- **Role Verification:** Subagents `TeacherVerifier`, `CRVerifier`, and `StudentVerifier` will audit all portals upon completion.
