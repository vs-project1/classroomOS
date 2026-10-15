# P1 Database Standardization & Subject Safety Design Spec
**Date:** 2026-10-16  
**Status:** Approved  
**Scope:** P1 Database Schema Integer Harmonization, Subject Cascade Delete Protection (RESTRICT + Soft Delete), and Query SQL Push-Down  

---

## 1. Overview & Objectives

Following the successful completion of P0 (Attendance dispute preservation, Routine collision engine, and Google Drive SpeedGrader integration), this P1 specification addresses technical debt and database safety:

1. **Semester Column Standardization:** Eliminate the split between `integer` (`students.semester`, `enrollments.semester`) and `text` (`subjects.semester`, `weekly_routine.semester`, `daily_sessions.semester`, `semester_telegram_configs.semester`). Standardize all database columns to `integer` (`1..8`), restricting Roman numerals (`"I"`..`"VIII"`) strictly to the presentation layer.
2. **Subject Delete Protection & Soft Deletes:** Change destructive foreign key cascades on `subjects.id` from `onDelete: "cascade"` to `onDelete: "restrict"`. Add `isActive: boolean` to `subjects` so deactivating a course is a safe soft archive that preserves historical transcripts, exam results, and lecture logs.
3. **Query Engine & Developer Experience (DX):** Remove runtime string comparison shims (`areSemestersEqual()`, `getSemesterVariants()`). Provide a single canonical utility `src/lib/semester.ts`. Push timetable filtering directly down into SQLite queries in `telegram-brief-service.ts`.

---

## 2. Developer Experience (DX) Review & Personas

* **Admin Developer Persona:** Currently forced to choose whether a subject form submits `"2"`, `"2nd"`, `"II"`, or `2`. Standardizing to `zSemester` (`z.coerce.number().int().min(1).max(8)`) provides uniform validation across all server actions.
* **Teacher / Auditor Persona:** Accidental subject deletion in admin previously triggered an irrevocable SQLite cascade that purged lecture logs and grades. Changing to `RESTRICT` + `isActive` guarantees zero accidental data destruction.
* **Query Performance Persona:** By aligning types to `INTEGER`, SQLite can perform direct indexed B-tree comparisons (`eq(students.semester, subjects.semester)`) rather than loading datasets into Node.js memory for JavaScript filtering.

---

## 3. Database Schema Modifications (`src/db/schema.ts`)

### 3.1. `subjects` Table
```typescript
export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull().unique(),
  semester: integer("semester").notNull().default(1), // Converted from text("I") to integer(1)
  teacherId: text("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), // Soft delete
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index("idx_subjects_semester").on(table.semester),
  index("idx_subjects_teacher_id").on(table.teacherId),
  index("idx_subjects_is_active").on(table.isActive),
  check("chk_subjects_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);
```

### 3.2. Foreign Key Cascade Protection
Update all tables referencing `subjects.id` to prevent cascading deletion of academic records:
* `courseUnits.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)
* `classSessions.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)
* `homework.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)
* `exams.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)
* `subjectGradeWeights.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)
* `enrollments.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)
* `weeklyRoutine.subjectId`: `{ onDelete: "restrict" }` (was `"cascade"`)

### 3.3. `weekly_routine` & `daily_sessions` Tables
```typescript
// weeklyRoutine
semester: integer("semester").notNull().default(1), // Converted to integer
// Add check constraint:
check("chk_weekly_routine_semester", sql`${table.semester} BETWEEN 1 AND 8`),

// dailySessions
semester: integer("semester").notNull().default(1), // Converted to integer
// Add check constraint:
check("chk_daily_sessions_semester", sql`${table.semester} BETWEEN 1 AND 8`),
```

### 3.4. Telegram Configurations & Broadcast Logs
```typescript
// semesterTelegramConfigs
semester: integer("semester").notNull().default(1),

// telegramBroadcastLogs
semester: integer("semester").notNull().default(1),
```

---

## 4. Canonical Utility: `src/lib/semester.ts`

A dedicated, unit-tested module that standardizes all semester parsing and UI formatting:

```typescript
import { z } from "zod";

export const ROMAN_SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

export function toSemesterNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 1;
  if (typeof val === "number") return Math.min(Math.max(Math.round(val), 1), 8);
  const clean = val.trim().toUpperCase();
  const romanIdx = ROMAN_SEMESTERS.indexOf(clean as any);
  if (romanIdx !== -1) return romanIdx + 1;
  const num = parseInt(clean.replace(/[^0-9]/g, ""), 10);
  if (!isNaN(num) && num >= 1 && num <= 8) return num;
  return 1;
}

export function toSemesterRoman(sem: number): string {
  const clamped = Math.min(Math.max(Math.round(sem), 1), 8);
  return ROMAN_SEMESTERS[clamped - 1] ?? "I";
}

export function toSemesterOrdinal(sem: number): string {
  const s = Math.min(Math.max(Math.round(sem), 1), 8);
  const suffix = s === 1 ? "st" : s === 2 ? "nd" : s === 3 ? "rd" : "th";
  return `${s}${suffix} Semester`;
}

export const zSemester = z.coerce.number().int().min(1).max(8);
```

---

## 5. Data Access Layer & Query Refactoring

1. **Delete Subject Action (`src/features/subjects/actions/`)**:
   Update `deleteSubjectAction` to soft-delete:
   ```typescript
   await db.update(subjects)
     .set({ isActive: false })
     .where(eq(subjects.id, subjectId));
   ```
2. **Subject Visibility Filtering**:
   All active queries for routine builder, student enrollment, and attendance roster filter by:
   ```typescript
   where(eq(subjects.isActive, true))
   ```
3. **Telegram Routine Query Push-Down (`src/features/telegram/services/telegram-brief-service.ts`)**:
   Push semester filtering directly to SQLite:
   ```typescript
   const todayRoutines = await db
     .select({
       routine: weeklyRoutine,
       subject: subjects,
       teacher: teachers,
     })
     .from(weeklyRoutine)
     .leftJoin(subjects, eq(weeklyRoutine.subjectId, subjects.id))
     .leftJoin(teachers, eq(weeklyRoutine.teacherId, teachers.id))
     .where(
       and(
         eq(weeklyRoutine.dayOfWeek, todayDayIndex),
         eq(weeklyRoutine.semester, configSemesterNum),
         eq(weeklyRoutine.section, config.section || "A")
       )
     )
     .orderBy(asc(weeklyRoutine.startTime));
   ```

---

## 6. Migration & Backfill Protocol

1. Create migration `0019_p1_semester_standardization.sql`:
   * Backfills existing Roman text strings (`"I"`..`"VIII"`, `"1st Semester"`, etc.) in SQLite to numeric integers (`1..8`).
   * Alters tables to apply `integer` column affinity and check constraints.
2. Synchronize `drizzle/meta/0019_snapshot.json` to guarantee `npx drizzle-kit check` passes.
3. Update `src/db/seed.ts` to insert integer semester values (`1..8`) across all seed records.

---

## 7. Verification Protocol

1. `npx tsc --noEmit`: 0 compiler errors.
2. `npx drizzle-kit check`: Parity verified.
3. Automated test suite `scripts/verify-p1-standardization.ts`:
   * Verify Roman $\leftrightarrow$ Integer mapping in `semester.ts`.
   * Verify soft delete deactivates subject without cascading deletion of lecture logs or marks.
   * Verify native SQL joins work cleanly between `students.semester` and `subjects.semester`.
   * Verify Telegram brief service queries only the targeted semester.
