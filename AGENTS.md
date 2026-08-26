<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-defined-rules -->
# User Defined Rules

1. **Role Synchronization:** Whenever you make changes that affect a specific user role (e.g., CR, Teacher, Student, Admin), always consider and sync how those changes affect other roles and what should be shown to them in their respective dashboards.
2. **Schema Verification:** Always check the database schema (src/db/schema.ts) to verify your assumptions before writing queries, to ensure the build won't break.
<!-- END:user-defined-rules -->

3. **Subagent Verification:** Whenever modifying logic that applies to multiple roles (or updating a core flow), invoke the \TeacherVerifier\, \CRVerifier\, and \StudentVerifier\ subagents to independently verify that their respective roles have not been broken or desynced.

