# P1 Database Standardization & Subject Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize all semester representations to integer (`1..8`) across the database schema, eliminate in-memory `areSemestersEqual` shims, protect subjects against catastrophic cascading deletions with `RESTRICT` and soft-delete (`isActive`), and push Telegram timetable filtering into SQL.

**Architecture:** Database columns for semester are migrated from `text` to `integer` with check constraints (`BETWEEN 1 AND 8`). A canonical utility `src/lib/semester.ts` provides typed conversion and formatting. Dependent tables reference `subjects.id` with `onDelete: "restrict"` while `subjects.isActive` enables non-destructive archiving.

**Tech Stack:** Next.js 15, TypeScript 5, SQLite, Drizzle ORM, Drizzle Kit, Vitest / Node.js test runners.

## Global Constraints

- Never use string comparisons (`"I"` or `"2nd Semester"`) in database columns or SQL query filters.
- Strictly enforce integer semesters between `1` and `8` via SQLite check constraints.
- Roman numeral formatting (`"I"`..`"VIII"`) is strictly an isolated UI presentation concern.
- All dependent tables (`courseUnits`, `classSessions`, `homework`, `exams`, `subjectGradeWeights`, `enrollments`, `weeklyRoutine`) must use `onDelete: "restrict"`.
- Subject deletion must be a soft-deactivate (`isActive = false`), never a destructive purge.
- `npx tsc --noEmit` must exit with 0 errors after each task.

---

### Task 1: Canonical Semester Utility & Unit Tests

**Files:**
- Create: `src/lib/semester.ts`
- Test: `tests/unit/semester.test.ts`

**Interfaces:**
- Produces:
  - `ROMAN_SEMESTERS`: `readonly ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]`
  - `toSemesterNumber(val: string | number | null | undefined): number`
  - `toSemesterRoman(sem: number): string`
  - `toSemesterOrdinal(sem: number): string`
  - `zSemester`: Zod schema `z.coerce.number().int().min(1).max(8)`

- [x] **Step 1: Write the failing unit tests**

```typescript
// tests/unit/semester.test.ts
import { describe, it, expect } from "vitest";
import {
  toSemesterNumber,
  toSemesterRoman,
  toSemesterOrdinal,
  zSemester,
} from "@/lib/semester";

describe("src/lib/semester.ts", () => {
  it("converts Roman numerals to numbers", () => {
    expect(toSemesterNumber("I")).toBe(1);
    expect(toSemesterNumber("ii")).toBe(2);
    expect(toSemesterNumber("III")).toBe(3);
    expect(toSemesterNumber("IV")).toBe(4);
    expect(toSemesterNumber("VIII")).toBe(8);
  });

  it("converts ordinal and numeric strings", () => {
    expect(toSemesterNumber("1st Semester")).toBe(1);
    expect(toSemesterNumber("2nd Semester")).toBe(2);
    expect(toSemesterNumber("3")).toBe(3);
    expect(toSemesterNumber(4)).toBe(4);
  });

  it("handles fallback and clamping", () => {
    expect(toSemesterNumber(null)).toBe(1);
    expect(toSemesterNumber(undefined)).toBe(1);
    expect(toSemesterNumber("invalid")).toBe(1);
    expect(toSemesterNumber(10)).toBe(8);
    expect(toSemesterNumber(-1)).toBe(1);
  });

  it("formats numbers to Roman numerals", () => {
    expect(toSemesterRoman(1)).toBe("I");
    expect(toSemesterRoman(2)).toBe("II");
    expect(toSemesterRoman(8)).toBe("VIII");
  });

  it("formats numbers to ordinals", () => {
    expect(toSemesterOrdinal(1)).toBe("1st Semester");
    expect(toSemesterOrdinal(2)).toBe("2nd Semester");
    expect(toSemesterOrdinal(3)).toBe("3rd Semester");
    expect(toSemesterOrdinal(4)).toBe("4th Semester");
  });

  it("validates using Zod schema", () => {
    expect(zSemester.parse("2")).toBe(2);
    expect(zSemester.parse(3)).toBe(3);
    expect(() => zSemester.parse(0)).toThrow();
    expect(() => zSemester.parse(9)).toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/semester.test.ts`
Expected: FAIL with "Cannot find module '@/lib/semester'"

- [x] **Step 3: Write minimal implementation**

```typescript
// src/lib/semester.ts
import { z } from "zod";

export const ROMAN_SEMESTERS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
] as const;

export type RomanSemester = (typeof ROMAN_SEMESTERS)[number];

export function toSemesterNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 1;
  if (typeof val === "number") {
    if (isNaN(val)) return 1;
    return Math.min(Math.max(Math.round(val), 1), 8);
  }
  const clean = String(val).trim().toUpperCase();
  const romanIdx = ROMAN_SEMESTERS.indexOf(clean as any);
  if (romanIdx !== -1) return romanIdx + 1;
  const num = parseInt(clean.replace(/[^0-9]/g, ""), 10);
  if (!isNaN(num) && num >= 1 && num <= 8) return num;
  return 1;
}

export function toSemesterRoman(sem: number): string {
  const clamped = Math.min(Math.max(Math.round(sem || 1), 1), 8);
  return ROMAN_SEMESTERS[clamped - 1] ?? "I";
}

export function toSemesterOrdinal(sem: number): string {
  const s = Math.min(Math.max(Math.round(sem || 1), 1), 8);
  const suffix = s === 1 ? "st" : s === 2 ? "nd" : s === 3 ? "rd" : "th";
  return `${s}${suffix} Semester`;
}

export const zSemester = z.coerce.number().int().min(1, "Semester must be between 1 and 8").max(8, "Semester must be between 1 and 8");
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/semester.test.ts`
Expected: PASS with 6 passing tests.

- [x] **Step 5: Commit**

```bash
git add src/lib/semester.ts tests/unit/semester.test.ts
git commit -m "feat(lib): add canonical semester utility and unit tests"
```

---

### Task 2: Database Schema Updates (Integer Columns & Soft Delete)

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Consumes: `src/lib/semester.ts`
- Produces:
  - `subjects.semester`: `integer` (`1..8`)
  - `subjects.isActive`: `boolean`
  - `weeklyRoutine.semester`: `integer` (`1..8`)
  - `dailySessions.semester`: `integer` (`1..8`)
  - `semesterTelegramConfigs.semester`: `integer` (`1..8`)
  - `telegramBroadcastLogs.semester`: `integer` (`1..8`)
  - Foreign keys to `subjects.id` with `{ onDelete: "restrict" }`

- [x] **Step 1: Update `src/db/schema.ts`**

Update `subjects`, `weeklyRoutine`, `dailySessions`, `semesterTelegramConfigs`, `telegramBroadcastLogs`, and dependent foreign keys:

```typescript
// In src/db/schema.ts:
// 1. subjects table:
export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull().unique(),
  semester: integer("semester").notNull().default(1),
  teacherId: text("teacher_id")
    .references(() => teachers.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_subjects_semester").on(table.semester),
  index("idx_subjects_teacher_id").on(table.teacherId),
  index("idx_subjects_is_active").on(table.isActive),
  check("chk_subjects_semester", sql`${table.semester} BETWEEN 1 AND 8`),
]);

// 2. Protect dependent tables with onDelete: "restrict":
// courseUnits:
subjectId: text("subject_id")
  .notNull()
  .references(() => subjects.id, { onDelete: "restrict" }),

// classSessions:
subjectId: text("subject_id")
  .notNull()
  .references(() => subjects.id, { onDelete: "restrict" }),

// homework:
subjectId: text("subject_id")
  .notNull()
  .references(() => subjects.id, { onDelete: "restrict" }),

// exams:
subjectId: text("subject_id")
  .notNull()
  .references(() => subjects.id, { onDelete: "restrict" }),

// subjectGradeWeights:
subjectId: text("subject_id")
  .notNull()
  .references(() => subjects.id, { onDelete: "restrict" }),

// enrollments:
subjectId: text("subject_id")
  .notNull()
  .references(() => subjects.id, { onDelete: "restrict" }),

// weeklyRoutine:
subjectId: text("subject_id")
  .references(() => subjects.id, { onDelete: "restrict" }),
semester: integer("semester").notNull().default(1),
// In weeklyRoutine constraints:
check("chk_weekly_routine_semester", sql`${table.semester} BETWEEN 1 AND 8`),

// dailySessions:
semester: integer("semester").notNull().default(1),
// In dailySessions constraints:
check("chk_daily_sessions_semester", sql`${table.semester} BETWEEN 1 AND 8`),

// semesterTelegramConfigs:
semester: integer("semester").notNull().default(1),
check("chk_semester_telegram_configs_semester", sql`${table.semester} BETWEEN 1 AND 8`),

// telegramBroadcastLogs:
semester: integer("semester").notNull().default(1),
check("chk_telegram_broadcast_logs_semester", sql`${table.semester} BETWEEN 1 AND 8`),
```

- [x] **Step 2: Run typecheck to verify schema compatibility**

Run: `npx tsc --noEmit`
Fix any type errors caused by schema field updates across query callers.

- [x] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "refactor(schema): standardize semester to integer and add subject delete protection"
```

---

### Task 3: Migration Generation, Data Backfill & Drizzle Sync

**Files:**
- Create: `drizzle/0019_p1_semester_standardization.sql`
- Create: `drizzle/meta/0019_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: `src/db/schema.ts`
- Produces: Migration SQL that backfills Roman text values to integers `1..8` and applies check constraints without data loss.

- [x] **Step 1: Generate and author the migration SQL**

Ensure `drizzle/0019_p1_semester_standardization.sql` updates existing rows converting:
- `'I'` $\to$ `1`
- `'II'` $\to$ `2`
- `'III'` $\to$ `3`
- `'IV'` $\to$ `4`
- `'V'` $\to$ `5`
- `'VI'` $\to$ `6`
- `'VII'` $\to$ `7`
- `'VIII'` $\to$ `8`
Before applying integer check constraints.

- [x] **Step 2: Run `npx drizzle-kit check` to verify snapshot parity**

Run: `npx drizzle-kit check`
Expected: `Everything's fine 🐶🔥`

- [x] **Step 3: Commit migration**

```bash
git add drizzle/0019_p1_semester_standardization.sql drizzle/meta/0019_snapshot.json drizzle/meta/_journal.json
git commit -m "feat(db): add migration 0019 for semester standardization and subject soft delete"
```

---

### Task 4: Subject Archive Action & Visibility Queries

**Files:**
- Modify: `src/features/subjects/actions/` or `src/features/subjects/queries.ts`
- Modify: `src/app/(admin)/admin/subjects/`

**Interfaces:**
- Consumes: `subjects.isActive`
- Produces: Soft-delete archive action and active subject filters.

- [x] **Step 1: Refactor subject delete action to soft-delete**

In `deleteSubjectAction` (or equivalent admin subject delete action):
```typescript
export async function deleteSubject(id: string) {
  await requireAuth(["ADMIN"]);
  // Soft delete — archives subject while preserving transcripts, lecture logs, and results
  await db.update(subjects)
    .set({ isActive: false })
    .where(eq(subjects.id, id));
  revalidatePath("/admin/subjects");
  revalidatePath("/routine");
  return { success: true, message: "Subject archived successfully." };
}
```

- [x] **Step 2: Add `isActive: true` filter to active dropdown queries**

In `getSubjects()`, `getAllSubjects()`, and routine builder options:
```typescript
where: eq(subjects.isActive, true)
```

- [x] **Step 3: Commit**

```bash
git add src/features/subjects/
git commit -m "feat(subjects): implement non-destructive soft archiving and active filtering"
```

---

### Task 5: Query Push-Down & Elimination of `areSemestersEqual`

**Files:**
- Modify: `src/features/telegram/services/telegram-brief-service.ts`
- Modify: `src/features/routine/actions/routine-actions.ts`
- Modify: `src/features/attendance/actions/daily.ts`

**Interfaces:**
- Consumes: `toSemesterNumber()` from `src/lib/semester.ts`
- Produces: Direct SQL joins and integer equality filtering.

- [x] **Step 1: Refactor `telegram-brief-service.ts`**

Push filtering into SQL:
```typescript
const targetSemesterNum = toSemesterNumber(config.semester);

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
      eq(weeklyRoutine.semester, targetSemesterNum),
      eq(weeklyRoutine.section, config.section || "A")
    )
  )
  .orderBy(asc(weeklyRoutine.startTime));
```

- [x] **Step 2: Remove obsolete `areSemestersEqual` shims**

Replace calls to `areSemestersEqual(semA, semB)` with:
```typescript
toSemesterNumber(semA) === toSemesterNumber(semB)
```
Or native SQL equality in database queries.

- [x] **Step 3: Commit**

```bash
git add src/features/telegram/services/telegram-brief-service.ts src/features/routine/
git commit -m "perf(routine): push semester query into SQL and eliminate runtime equality shims"
```

---

### Task 6: Automated Verification Suite & Pre-Commit Audit

**Files:**
- Create: `scripts/verify-p1-standardization.ts`

**Interfaces:**
- Tests all P1 deliverables against the live SQLite database.

- [x] **Step 1: Write `scripts/verify-p1-standardization.ts`**

Tests:
1. `toSemesterNumber` and `toSemesterRoman` conversion accuracy.
2. Direct SQL join between `students.semester` and `subjects.semester`.
3. Subject deletion restriction: inserting dependent record and attempting hard delete throws SQLite constraint error.
4. Soft delete sets `isActive = false` and keeps lecture logs intact.
5. Telegram routine query returns only matching semester records.

- [x] **Step 2: Run verification script**

Run: `npx tsx --env-file=.env.local scripts/verify-p1-standardization.ts`
Expected: All tests pass.

- [x] **Step 3: Run zero-regression typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [x] **Step 4: Commit**

```bash
git add scripts/verify-p1-standardization.ts
git commit -m "test(verify): add automated verification suite for P1 standardization"
```
