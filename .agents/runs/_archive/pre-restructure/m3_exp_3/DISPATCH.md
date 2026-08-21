# Milestone 3 Explorer 3 Dispatch: Homework & UploadThing File Submissions

## Identity & Role
You are `m3_exp_3`, a `teamwork_preview_explorer`.
Working Directory: `D:\CLASSROOM OS\.agents\m3_exp_3`

## Inputs
- Authoritative User Request: `D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md`
- Project Index: `D:\CLASSROOM OS\PROJECT.md`
- Test Spec: `tests/e2e/homework-submissions.spec.ts`
- Current Schema: `src/db/schema.ts`

## Mission & Investigation Scope
Investigate requirements and technical strategy for Homework Workspace and UploadThing File Submissions:
1. **Homework Workspace (`src/app/(student)/homework/page.tsx`)**:
   - 5 Filter Tabs: `Active`, `Due Soon` (within 48h), `Overdue`, `Submitted`, `Graded`.
   - Card listings with Subject badge, Title, Due Date formatted, Submission status, and points/grade if graded.
   - Assignment detail & submission modal:
     - View assignment description and attachments.
     - Text response editor.
     - File upload dropzone powered by UploadThing (supporting PDF, ZIP, DOCX, Code, Images up to 16MB).
     - Draft saving capability (`status: "DRAFT"`).
     - Submit button creating/updating `assignment_submissions` with `status: "SUBMITTED"` and timestamp.
     - Grade and feedback display when `status === "GRADED"`.
2. **UploadThing File Storage (`src/app/api/uploadthing/`)**:
   - `core.ts`: File router definition:
     - `assignmentSubmission`: 16MB max file size, verified via `getCurrentUser()` to ensure caller is an authenticated student.
     - `courseMaterial`: 16MB max file size for teachers/admins.
   - `route.ts`: App router handler exporting `createRouteHandler`.
3. Review `tests/e2e/homework-submissions.spec.ts` to ensure all data-testid locators and submission interaction flows match.

Write your findings and technical recommendations to `D:\CLASSROOM OS\.agents\m3_exp_3\handoff.md`.
Notify parent (`81194be9-fd5f-431c-b294-ad7fc2da9ec6`) via send_message when done.
