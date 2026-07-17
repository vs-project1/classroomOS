<!-- BEGIN:classroom-os-architecture-rules -->
# Classroom OS Architecture & Philosophy

When working on Classroom OS, adhere to the following strict guidelines:

## 1. Radical Simplicity (YAGNI)
- Keep the architecture clean and minimal.
- Do NOT optimize for imaginary future complexity.
- Do NOT create empty infrastructure folders (e.g., `src/features/`, `src/components/`, `src/lib/`) until there is an immediate, proven need for them.
- Use unified files (e.g., a single `src/db/schema.ts`) until they become too large to read, rather than splitting them prematurely.

## 2. Strict Database-Level Integrity
- Do NOT rely solely on TypeScript types or Zod schemas for data integrity.
- Enforce constraints directly at the database level using SQLite `CHECK` constraints (e.g., for enums like status) and composite `UNIQUE` constraints.
- Foreign keys must explicitly define deletion behavior (e.g., `CASCADE`).
- Explicitly model deletion paths (e.g., Subject deletion cascades downwards; Student deletion cascades horizontally).

## 3. Rigorous Verification
- Verification scripts must test the full lifecycle, not just happy-path insertions.
- Scripts must actively attempt to violate database constraints (e.g., inserting duplicates, invalid enums) and assert that the database explicitly rejects them.
- Scripts must test cleanup mechanisms like cascading deletes to ensure no orphaned records remain.
## 4. Server Actions & Mutations
- Use React 19 Server Actions (via `useActionState`) for all data mutations. Do not create separate API Route handlers (`route.ts`) for internal UI data flow.
- Always validate incoming `FormData` using Zod before passing it to the database layer. Never insert raw `FormData` directly.
- Server Actions must return a standardized state shape (e.g. `{ success: boolean, message?: string, fieldErrors?: object }`).
- Do NOT run pre-emptive "check if exists" `SELECT` queries before inserting. Rely strictly on the database-level constraints (like `UNIQUE`) to fail the insertion. Catch the SQLite constraint error gracefully in the Server Action and map it to a user-friendly message.
<!-- END:classroom-os-architecture-rules -->

<!-- BEGIN:classroom-os-ui-and-validation-rules -->
## 5. UI & Validation Standards (Learnings from Phase 3C)
- **Timezone Standardization**: When generating default dates or times, always use the `Asia/Kathmandu` (NPT) timezone via `new Intl.DateTimeFormat('en-CA', ...)` for forms, rather than raw `new Date().toISOString()`, to prevent UTC boundary mismatches.
- **Strict Temporal Validation**: When dealing with time bounds (e.g. `startTime` and `endTime`), use Zod's `.refine()` at the schema object level to ensure logical progression (e.g. `endTime > startTime`).
- **Shadcn v4 Button + Link**: When using Next.js `<Link>` elements styled as buttons, do NOT use the `<Button render={<Link />}>` prop pattern as it triggers Base UI native button accessibility errors. Instead, render a native `<Link className={buttonVariants({ variant: "outline" })}>`.
- **Hydration Mismatches**: Ensure `suppressHydrationWarning` is applied to the root `<html>` tag to prevent Chrome extensions (like `crxlauncher`) from crashing React 19's strict hydration process.
- **Homework vs. Assignments Terminology**: The system treats "Homework" and "Assignments" as two distinct concepts. 
  - **Homework** represents daily, non-compulsory recap work or reading, typically recorded as simple text within a Session's notes.
  - **Assignments** represent compulsory tasks with strict due dates and submission requirements. The UI strictly uses the term "Assignments" for these (even if the underlying database table is currently named `homework`). Students will be able to see both distinct types of work.
<!-- END:classroom-os-ui-and-validation-rules -->

<!-- BEGIN:classroom-os-entity-relationships -->
## 6. Entity Relationships & System Integration (Phases 1-3)
Understanding how the core tables connect is vital for future feature development:
- **Core Triangle (Teachers, Subjects, Students)**: `Teachers` teach `Subjects`. `Students` study those `Subjects`. This forms the foundation of all scheduling and records.
- **Scheduling (Weekly Routine)**: The `weeklyRoutine` is the rigid backbone of the system. It maps a `Subject` (and thus its `Teacher`) to a specific `dayOfWeek` and time slot. 
- **Execution (Sessions)**: A `Session` is the actual, historical execution of a class. It records when a `Subject` was actually taught. It is the central hub for logging historical data.
- **Interconnections via Sessions**:
  - **Attendance**: Links `Students` to a `Session`.
  - **Homework**: While `Homework` is linked to a `Subject`, it is formally born from a `Session`. Creating a `Session` automatically provisions the corresponding `Homework` assignment for that day.
- **Global Context (Notices & Events)**: `Notices` and `Events` sit globally at the school/admin level, independent of specific subjects or sessions.

**Data Flow Paradigm**: 
1. The **Admin** sets up the rigid structures (Teachers -> Subjects -> Routine).
2. The **Teacher/CR (Class Representative)** executes daily operations by logging **Sessions** based on the Routine.
3. Logging a Session acts as a cascading trigger: it captures attendance, notes, topics, and automatically generates **Homework**.
<!-- END:classroom-os-entity-relationships -->
