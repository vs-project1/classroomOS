## 2026-08-15T12:43:22Z

<USER_REQUEST>
You are Explorer 3 designing the Playwright configuration and test fixture architecture for Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_3
Read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md
- D:\CLASSROOM OS\.agents\sub_orch_e2e\SCOPE.md

Tasks:
1. Design `playwright.config.ts`:
   - Setup `webServer` configuration (command: `npm run dev`, port: 3000, timeout: 120000ms, reuseExistingServer: !process.env.CI).
   - Configure projects for Chromium/desktop browsers.
   - Configure test directory (`tests/e2e`), output directory, reporters, screenshots, traces on failure.
2. Design test fixture architecture (`tests/fixtures/`):
   - Auth helpers / session injection (cookies for ADMIN, STUDENT, NEW_STUDENT with `mustChangePassword`, UNAUTHORIZED student).
   - Database reset / seeding strategy for deterministic test runs.
   - Page Object Model (POM) or reusable locator helpers for navigation, forms, alerts, and tables.
   - UploadThing / file upload test mocking or synthetic file submission strategy.
3. Detail concrete implementation snippets and recommendations in `D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_3\handoff.md`.
4. Send a completion message to parent orchestrator.
</USER_REQUEST>
