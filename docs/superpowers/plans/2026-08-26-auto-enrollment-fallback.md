# Auto-Enrollment Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dynamic fallback for subjects and routines so students with empty `enrollments` automatically see subjects matching their semester (mapped to Roman numerals).

**Architecture:** Modify the frontend data-fetching in `/subjects` and `/today` to map the integer `studentProfile.semester` to a Roman numeral, and use that string to filter `subjects.semester` dynamically.

**Tech Stack:** Next.js 15, Drizzle ORM, React

## Global Constraints
- Do not mutate the database; this is a read-time fallback.
- Code must be type-safe.
- Maintain existing `enrollments` check logic so explicit enrollments continue to take precedence.

---

### Task 1: Roman Numeral Helper & Profile Format

**Files:**
- Create: `src/lib/utils/roman.ts`
- Modify: `src/app/(student)/profile/page.tsx`

**Interfaces:**
- Produces: `export function toRoman(num: number): string` (handles 1-8).

- [ ] **Step 1: Create roman.ts helper**

```typescript
// src/lib/utils/roman.ts
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function toRoman(semester: number): string {
  if (semester < 1 || semester > 8) return String(semester);
  return ROMAN_NUMERALS[semester - 1];
}
```

- [ ] **Step 2: Update Profile Page to show formatted semester**
Update `src/app/(student)/profile/page.tsx` where academicRows is defined.

```typescript
// Add import at top:
// import { toRoman } from "@/lib/utils/roman";

// Change the semester row in academicRows:
        ["Semester", profile.semester != null ? `${profile.semester}th Semester (${toRoman(profile.semester)})`.replace("1th", "1st").replace("2th", "2nd").replace("3th", "3rd") : null],
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/roman.ts src/app/\(student\)/profile/page.tsx
git commit -m "feat: add roman numeral helper and format semester in profile"
```

### Task 2: Update Subjects Page Fallback

**Files:**
- Modify: `src/app/(student)/subjects/page.tsx`

**Interfaces:**
- Consumes: `toRoman` from `src/lib/utils/roman.ts`

- [ ] **Step 1: Update Subjects Page to fallback by semester**
In `src/app/(student)/subjects/page.tsx`, import `toRoman`. Also query `studentProfiles` to get the student`s semester since `resolveCurrentStudent` only returns `students`.

```typescript
import { toRoman } from "@/lib/utils/roman";
import { studentProfiles } from "@/db/schema";
// ... inside SubjectsPage component:

  if (student && user.studentProfileId) {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });

    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.studentId, student.id),
      with: {
        subject: {
          with: { teacher: true, courseUnits: true, homework: { where: eq(homework.status, "active") }, resources: true },
        },
      },
    });

    if (userEnrollments.length > 0) {
      // existing logic
      enrolledSubjects = userEnrollments.filter((e) => e.subject != null).map((e) => ({
        id: e.subject.id,
        name: e.subject.name,
        slug: e.subject.slug,
        code: e.subject.code,
        teacherName: e.subject.teacher?.name || "Faculty Member",
        unitCount: e.subject.courseUnits?.length || 0,
        activeHwCount: e.subject.homework?.length || 0,
        resourceCount: e.subject.resources?.length || 0,
      }));
    } else if (profile && profile.semester != null) {
      // Dynamic Fallback
      const semesterRoman = toRoman(profile.semester);
      const semesterSubjects = await db.query.subjects.findMany({
        where: eq(subjects.semester, semesterRoman),
        with: { teacher: true, courseUnits: true, homework: { where: eq(homework.status, "active") }, resources: true },
      });

      enrolledSubjects = semesterSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        code: s.code,
        teacherName: s.teacher?.name || "Faculty Member",
        unitCount: s.courseUnits?.length || 0,
        activeHwCount: s.homework?.length || 0,
        resourceCount: s.resources?.length || 0,
      }));
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(student\)/subjects/page.tsx
git commit -m "feat: fallback to subjects by semester if no enrollments"
```

### Task 3: Update Today Page Routine Filtering

**Files:**
- Modify: `src/app/(student)/today/page.tsx`

**Interfaces:**
- Consumes: `toRoman` from `src/lib/utils/roman.ts`

- [ ] **Step 1: Filter Today Page Routines by mapped semester**
In `src/app/(student)/today/page.tsx`, import `toRoman`.
Find where `routinesWithStatus` is constructed or where `classContext` is used.
Wait, `dayRoutines` currently fetches ALL routines for the day without filtering by semester! 
We must filter `dayRoutines` locally after fetching.

```typescript
import { toRoman } from "@/lib/utils/roman";

// Inside TodayPage, after fetching dayRoutines:
  let filteredRoutines = dayRoutines;
  if (role === "STUDENT" || role === "CR") {
    if (classContext && classContext.semester != null) {
      const semesterRoman = toRoman(classContext.semester);
      filteredRoutines = dayRoutines.filter(r => r.subject?.semester === semesterRoman);
    } else {
      filteredRoutines = []; // No context, no routines
    }
  } else if (role === "TEACHER") {
    // Teachers only see their own routines
    if (user?.teacherId) {
      filteredRoutines = dayRoutines.filter(r => r.subject?.teacherId === user.teacherId || r.teacherName === user.name);
    } else {
      filteredRoutines = [];
    }
  }

  const routinesWithStatus = filteredRoutines.map((routine) => {
    // existing mapping...
```
*(Also clean up any leftover old `classContext.semester` filtering logic if it still exists in the code from a previous schema).*

- [ ] **Step 2: Check Build**

```bash
pnpm run build
```
Verify there are no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(student\)/today/page.tsx
git commit -m "feat: correctly filter daily routines by mapped roman semester and role"
```

