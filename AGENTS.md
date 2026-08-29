<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-defined-rules -->
# User Defined Rules & Self-Improving Protocols

1. **Role Synchronization:** Whenever you make changes that affect a specific user role (e.g., CR, Teacher, Student, Admin), always consider and sync how those changes affect other roles and what should be shown to them in their respective dashboards.
2. **Schema Verification:** Always check the database schema (src/db/schema.ts) to verify your assumptions before writing queries, to ensure the build won't break.
3. **Subagent Verification:** Whenever modifying logic that applies to multiple roles (or updating a core flow), invoke the `TeacherVerifier`, `CRVerifier`, and `StudentVerifier` subagents to independently verify that their respective roles have not been broken or desynced.
4. **Self-Improving Learnings Protocol:** You MUST read and follow the architectural invariants and mistake countermeasures in `LEARNINGS.md`. Every time a bug, design oversight, or edge case is resolved, you are REQUIRED to append the root cause and permanent countermeasure into `LEARNINGS.md`.
5. **Zero-Regression Typecheck Verification:** Never claim work is done or fixed without executing `npx tsc --noEmit` and verifying a 0-error exit code.
<!-- END:user-defined-rules -->

# Codebase Best Practices & Engineering Guidelines

### 1. Zero Dead Code & Orphaned Artifacts
- **No Unused Code:** Never leave behind unreferenced components, dead functions, obsolete types, or commented-out code blocks.
- **Clean Refactoring:** When replacing a component or service (e.g., replacing legacy sidebars with `AppShell`), immediately delete the obsolete predecessor and update all imports across the codebase.
- **No Shadow Re-Export Facades:** Do not create or leave single-line re-export files (`export * from "@/features/..."`) in `src/app/` or `src/lib/`. Always import directly from canonical domain modules.

### 2. Repository Hygiene & Script Containment
- **Root Directory Cleanliness:** Never create or leave loose one-off scripts, fix scripts, or scratch files in the repository root (`fix_*.js`, `patch.js`, `scratch.*`).
- **Structured Tooling:** All maintenance, seeding, migration, and verification utilities must be placed in `scripts/` (e.g., `scripts/maintenance/`, `scripts/seed/`) with clear documentation.
- **Data Isolation:** SQLite database files (`local.db`, `local.test.db`) and temporary outputs must reside in appropriate ignored directories, never tracked or cluttered in root.

### 3. Modular Feature Architecture
Organize domain logic strictly by feature slice inside `src/features/<feature-name>/`:
- `actions/`: Server Actions with typed Zod input validation and uniform error handling.
- `components/`: UI components exclusive to this feature domain.
- `queries/`: Data Access Layer (DAL) query functions.
- `services/` or `calculations/`: Pure business logic, domain algorithms, and calculations.
- `types/`: Domain-specific TypeScript types and Zod schemas.

Cross-cutting primitives belong in:
- `src/components/ui/`: Base UI primitives (shadcn / Radix / Base UI).
- `src/components/shell/`: Global layout chrome (`AppShell`, navigation, topbar, avatar menus).
- `src/lib/`: Cross-cutting core infrastructure (auth, RBAC, timezone, formatting).

### 4. Data Access Layer (DAL) & Thin Server Components
- **Thin Presentation:** React Server Components (`page.tsx`) must focus purely on layout and presentation. Do not write raw multi-table Drizzle queries, dynamic imports, or string calculations inside component bodies.
- **Encapsulated Queries:** Delegate all data fetching to dedicated query functions in `src/features/<feature>/queries.ts` or `src/db/queries/`.
- **Database Aggregations:** Use SQL aggregations (`count()`, `sum()`, `groupBy`) rather than pulling raw datasets into JavaScript memory to calculate counts or metrics.

### 5. Unified Authorization & Security
- **Single Source of Truth:** Never maintain multiple conflicting authorization models. Use the centralized RBAC / capability engine in `src/lib/auth/`.
- **Server-Side Enforcement:** Always enforce role and resource ownership checks inside Server Actions and Data Access functions (`requireAuth()`, `can()`), never relying solely on client-side hiding.

### 6. Standardized Server Action Contracts
- **Strict Validation:** Parse all incoming `FormData` or payloads with Zod schemas.
- **Predictable Return Types:** Standardize Server Action responses:
  ```ts
  export type ActionResult<T = void> =
    | { success: true; data?: T; message?: string }
    | { success: false; error: string; fieldErrors?: Record<string, string[]> };
  ```
- **Next.js Redirect Safety:** Never swallow `NEXT_REDIRECT` errors in `try/catch` blocks.
- **Explicit Typing:** Avoid untyped `any` parameters and provide explicit typing for state and errors.

### 7. Performance & Caching
- **Eliminate N+1 Queries:** Use relational `with:` joins or batched queries (`Promise.all`) instead of querying sequentially in loops.
- **Smart Caching:** Use React `cache()` for per-request deduplication and `unstable_cache` with tag-based revalidation for slowly changing master data (routine, subjects, syllabus).
