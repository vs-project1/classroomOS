# Admin Accounts Management Upgrades

## Overview
Overhaul the `/admin/accounts` page to provide discrete table columns for user attributes, add a semester filter, and implement robust Edit/Upgrade and Delete database actions for the Administrator role.

## 1. Table Layout & Filters
- **Discrete Columns:** Replace the grouped "User Identity" and "Academic Metadata" columns with individual columns: 
  - Name
  - Email
  - Role
  - Roll Number
  - Semester
  - Status
  - Actions
- **Combined Filtering:** 
  - Add a **Semester Filter** dropdown (All, I, II, III, IV, V, VI, VII, VIII).
  - Ensure filters are combinable (e.g., selecting "Semester I" and "Role: Students" accurately filters the table).
  - Note: Filtering by "Students" role should logically include "CR" (Class Representatives) since they share the same academic context.
  - If the role is filtered to "Teachers" or "Admins", the Semester filter should either apply if they are mapped to one, or gracefully show no academic metadata.

## 2. Edit & Upgrade Flow (Modal)
- **UI:** Add an "Edit" button in the Actions column.
- **Form Fields:** Modal containing inputs for Name, Email, Roll Number, Semester, and Role.
- **Role Upgrade:** Admins can change a user's role (e.g., upgrading a STUDENT or TEACHER to ADMIN).
- **Confirmation:** Submitting the form triggers a secondary confirmation dialog ("Are you sure you want to save these changes?") to prevent accidental overwrites.
- **Database Action:** 
  - Create a new Server Action `editUserAccountAction` in `src/app/actions/accounts.ts`.
  - The action must use Drizzle ORM transactions to update `users`, `students`, `studentProfiles`, and `teachers` tables synchronously so data remains consistent across identity and academic tables.

## 3. Delete Account Flow
- **UI:** Add a red "Delete" button in the Actions column.
- **Confirmation:** Triggers a strict destructive confirmation dialog warning of permanent data loss.
- **Database Action:** 
  - Create a new Server Action `deleteUserAccountAction` in `src/app/actions/accounts.ts`.
  - Safely deletes the user from the `users` table. Because Drizzle schema defines `onDelete: "cascade"` for foreign keys (e.g., `student_profiles.user_id`), this will cascade and wipe all related metadata.
