# Design: Dynamic Fallback for Fixed BCA Subjects

## Context
The BCA faculty (following TU syllabus) has fixed subjects per semester. Currently, students are expected to have explicit `enrollments` mapping them to their subjects. However, the `enrollments` table is empty, causing students to see no subjects on their dashboard or subjects page.

## Proposed Architecture
Since the subjects are fixed per semester, we can rely on a **dynamic fallback** mechanism instead of requiring explicit database enrollments for every student.

When a student accesses their Subjects or Today page:
1. We check their `studentProfile.semester` (e.g., `4`).
2. We map this integer to a Roman numeral (e.g., `"IV"`).
3. If their `enrollments` table is empty, we automatically fetch all subjects matching `semester === "IV"` and display those as their enrolled subjects.
4. The `Today` schedule will also filter the global `weekly_routine` list so that students only see routines belonging to subjects that match their semester.

## Benefits
- **Zero Administrative Overhead:** No need to run enrollment scripts when a semester changes. Just update the student`s semester in their profile, and they instantly get the correct subjects and routines.
- **Graceful Fallback:** If the college introduces electives later, explicit `enrollments` will still override this fallback behavior automatically.

## Implementation Details
1. A helper `toRoman(num: number): string` will handle mapping integer semesters to Roman numerals (`subjects.semester`).
2. Update `/subjects/page.tsx` to conditionally fetch `subjects` by semester if `userEnrollments` length is 0.
3. Update `/today/page.tsx` to filter `dayRoutines` so it only includes routines where the `subject.semester` matches the user`s `studentProfile.semester`.
4. Update `/profile/page.tsx` so the academic details row nicely formats the integer (e.g., `4th Semester (IV)`) to reduce user confusion.

