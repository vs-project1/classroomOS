## 2026-08-15T12:37:21Z
You are a Survey Explorer.
Your working directory is: D:\CLASSROOM OS\.agents\explorer_survey_codebase_1
You MUST read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md
- graphify-out/GRAPH_REPORT.md (if present)

Your task:
Perform a comprehensive survey of the existing codebase in D:\CLASSROOM OS.
Investigate:
1. Current project structure, Next.js version, package.json dependencies, config files (tailwind, drizzle, etc.).
2. Existing database setup: Drizzle schema (src/db/schema.ts), client, migrations, existing tables (teachers, subjects, students, weeklyRoutine, sessions, attendance, homework, notices, events).
3. Existing routes and UI components: what pages exist right now, what layout/components exist (shadcn, Lucide icons, etc.).
4. UploadThing or file storage setup if any, or what packages are needed.
5. Testing setup: Playwright config, package.json test scripts, vitest/jest if any.
6. Check all rules in AGENTS.md (e.g. Radically Simple architecture, SQLite CHECK constraints, React 19 Server Actions, Asia/Kathmandu timezone, Homework vs Assignments distinction, Graphify).

Write your detailed findings to:
D:\CLASSROOM OS\.agents\explorer_survey_codebase_1\handoff.md
Include: Observation, Logic Chain, Caveats, Conclusion, and Recommendations for architecture and milestones.
Send a completion message back to parent when done.
