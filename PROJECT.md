# Classroom OS

A production-quality web application to help college classrooms manage attendance, daily lecture logs, subject progress, homework, notices, study resources, and missed class summaries.

## Current Architecture

Classroom OS uses a Next.js (App Router) monolithic architecture operating as a Render Web Service.

**Request Flow:**
```text
Browser/Form → Server Action / Route Handler → Zod Validation → Business Logic → Drizzle ORM → libSQL Client → Database → Revalidation
```

**Database Strategy (libSQL everywhere):**
- **Local:** SQLite file (`local.db`) using the libSQL driver.
- **Production:** Turso using a remote `libsql://` URL and authentication token.
- **Schema:** Defined centrally in `src/db/schema.ts`.
- **Client Security:** The database connection is explicitly wrapped in `src/db/index.ts` with `"server-only"` to ensure database operations never accidentally leak into client bundles, while `src/db/client.ts` allows raw access for scripts.

**Environment Management:**
Environment variables are strongly validated at startup via Zod in `src/env.ts`.

## Implemented Features

### Phase 1: Core Database & Application Infrastructure
- **Next.js Scaffold:** Barebones setup with App Router, TypeScript, and Tailwind CSS.
- **Drizzle ORM & libSQL:** Local database connectivity configured and verified.
- **Verification Script:** A standalone database verification script (`scripts/verify-db.ts`) validated the lifecycle.

### Phase 2: Core Data Model
- **Real-World Hierarchy:** Modeled `Subjects -> Class Sessions -> [Lecture Logs, Attendance (-> Students)]`.
- **Database-Level Integrity:** Implemented composite unique constraints, strict `CHECK` constraints on enums (e.g., attendance status), and `CASCADE` rules on all foreign keys directly inside SQLite.
- **Drizzle Relations:** Configured ORM `relations` to facilitate complex, nested Next.js data fetching.

## Planned Features

- **Authentication:** To be implemented using Better Auth.
- **Attendance Tracking:** Core domain logic for tracking student attendance.
- **Homework & Notices:** Management systems for assignments and announcements.
- **Study Resources:** File and resource distribution system using Cloudflare R2.
- **UI System:** Integration with shadcn/ui for accessible, standard components.

## Architecture Decisions Log

| Decision | Why Chosen | Alternatives Considered | When to Reconsider |
| :--- | :--- | :--- | :--- |
| **libSQL Driver Everywhere** | Minimizes development-vs-production drift; uses standard SQL and client APIs for both local files and Turso. | Prisma (too heavy), `better-sqlite3` (local only). | If advanced PostgreSQL-specific features are needed. |
| **Next.js Web Service** | Essential for server-side logic, session validation, route handlers, and SSR capabilities. | Static Site (SSG), Vercel Serverless. | If scaling strictly demands a serverless/edge model. |
| **Server-only DB guard** | Next.js Server Components require protection against accidental client-side inclusion of node APIs/secrets. | Next.js undocumented implicit guards. | If the `server-only` pattern is deprecated by Next.js. |
| **Unified schema file** | Prevents premature optimization of folder structures. | One file per table inside `src/db/schema/`. | When the schema file becomes large enough to impede readability. |
| **Strict Database-Level Constraints** | SQLite `CHECK` and composite `UNIQUE` constraints guarantee integrity even if TypeScript/Next.js layers fail. | Enforcing solely via Zod or application logic. | If the database engine changes to one lacking standard CHECK constraints. |
