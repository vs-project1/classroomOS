# Unit-Based and Chapter-Based Subject Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable teachers and administrators to add resources directly to Units and Chapters from the Subject curriculum page and Central Resources Hub, while giving students a dedicated Unit Resources Shelf inside each unit accordion and multi-tier scope filtering in the Central Library.

**Architecture:** Add `unit_id` column to `resources` table in SQLite schema. Modernize `createResourceAction` and DAL queries in `src/features/resources/` to handle 3-tier scoping (`SUBJECT`, `UNIT`, `CHAPTER`). Build a reusable in-context `AddResourceModal` and integrate editorial controls on Subject pages for teachers/admins, while rendering a clean "Unit Resources Shelf" for students before sub-chapters.

**Tech Stack:** Next.js 15 App Router, React 19, Drizzle ORM, LibSQL/SQLite, Tailwind CSS v4, Base UI / Radix primitives via shadcn, UploadThing, Sonner.

## Global Constraints
- Timezone is strictly `Asia/Kathmandu` (NPT).
- Enforce strict RBAC: Only `ADMIN` or the assigned `TEACHER` can create or delete resources. `STUDENT` and `CR` are strictly read-only.
- Zero TypeScript errors (`npx tsc --noEmit`).
- No dead code, orphaned predecessor components, or untracked loose scripts.

---

## File Structure

```
src/
├── db/
│   └── schema.ts                                      # Add unitId to resources table & relations
├── features/
│   ├── resources/
│   │   ├── actions/
│   │   │   └── resources.ts                           # Update createResourceAction, schema, and chapter tree
│   │   ├── components/
│   │   │   ├── add-resource-modal.tsx                 # NEW: Reusable in-context upload modal
│   │   │   ├── resource-form.tsx                      # Modernize unit/chapter dropdown
│   │   │   └── resources-workspace.tsx                # Render unit & chapter resources in structured view
│   │   └── queries.ts                                 # Return unitTitle, unitOrder, and scope
│   └── subjects/
│       └── components/
│           ├── add-unit-dialog.tsx                    # NEW: Extracted for Teacher & Admin use
│           └── add-chapter-dialog.tsx                 # NEW: Extracted for Teacher & Admin use
├── app/
│   ├── (admin)/admin/subjects/[id]/page.tsx           # Add in-context Unit/Chapter resource buttons
│   ├── (student)/
│   │   ├── subjects/[slug]/page.tsx                   # Add editorial buttons for Teachers; add Unit Resources Shelf for Students
│   │   └── resources/resources-client.tsx             # Add scope badges & filter tabs
└── scripts/
    └── maintenance/
        ├── migrate-schema-sync.ts                     # Add ALTER TABLE resources ADD COLUMN unit_id
        └── verify-unit-resources.ts                   # Verification test script
```

---

### Task 1: Database Schema & Migration

**Files:**
- Modify: `src/db/schema.ts:399-424, 670-685, 770-784`
- Modify: `scripts/maintenance/migrate-schema-sync.ts:40-60`
- Test: `scripts/maintenance/verify-unit-resources.ts`

**Interfaces:**
- Consumes: `courseUnits.id`, `subjects.id`
- Produces: `resources.unitId`, `courseUnitsRelations.resources`, `resourcesRelations.unit`

- [ ] **Step 1: Update schema in `src/db/schema.ts`**
  Add `unitId: text("unit_id").references(() => courseUnits.id, { onDelete: "set null" })` to `resources` table with index `idx_resources_unit`. Update `courseUnitsRelations` and `resourcesRelations`.

- [ ] **Step 2: Add migration alter table to `scripts/maintenance/migrate-schema-sync.ts`**
  Check `PRAGMA table_info(resources)` and add `ALTER TABLE resources ADD COLUMN unit_id TEXT REFERENCES course_units(id)` if missing.

- [ ] **Step 3: Run migration sync**
  Run: `npx tsx scripts/maintenance/migrate-schema-sync.ts`
  Expected: "Added unit_id to resources" or "Column unit_id already exists".

- [ ] **Step 4: Verify typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add src/db/schema.ts scripts/maintenance/migrate-schema-sync.ts
  git commit -m "feat(db): add unit_id to resources table and relations"
  ```

---

### Task 2: Server Action & DAL Modernization

**Files:**
- Modify: `src/features/resources/actions/resources.ts:20-190`
- Modify: `src/features/resources/queries.ts:17-31, 99-195`

**Interfaces:**
- Consumes: `unitId`, `chapterId`, `subjectId`
- Produces: `createResourceAction(prevState, formData)`, `ResourceWithDetails.unitId`, `ResourceWithDetails.scope`

- [ ] **Step 1: Update `createResourceSchema` in `src/features/resources/actions/resources.ts`**
  Add `unitId: z.string().nullable().optional()`.
  In `createResourceAction`, parse `unitId` directly from `formData.get("unitId")`.
  Remove the legacy string hack (`parsed.data.chapterId.startsWith("unit:")`) and remove auto-creation of dummy chapters.
  Save `unitId` and `chapterId` directly into `db.insert(resources)`.

- [ ] **Step 2: Update `getChapterTreeAction` in `src/features/resources/actions/resources.ts`**
  Ensure it returns each unit with its ID, title, and child chapters for clean hierarchy selection.

- [ ] **Step 3: Update `ResourceWithDetails` and queries in `src/features/resources/queries.ts`**
  Add `unitId: string | null`, `unitTitle: string | null`, `unitOrder: number | null`, and `scope: "SUBJECT" | "UNIT" | "CHAPTER"`.
  Join `courseUnits` via `resources.unitId` (or fallback `courseChapters.unitId`).

- [ ] **Step 4: Verify typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/resources/actions/resources.ts src/features/resources/queries.ts
  git commit -m "feat(resources): modernize createResourceAction and DAL for unit and chapter scoping"
  ```

---

### Task 3: Reusable In-Context Add Resource Modal & Extracted Syllabus Dialogs

**Files:**
- Create: `src/features/resources/components/add-resource-modal.tsx`
- Create: `src/features/subjects/components/add-unit-dialog.tsx`
- Create: `src/features/subjects/components/add-chapter-dialog.tsx`

**Interfaces:**
- Consumes: `createResourceAction`, `addCourseUnit`, `addCourseChapter`
- Produces: `<AddResourceModal subjectId={...} unitId={...} chapterId={...} targetLabel={...} />`, `<AddUnitDialog subjectId={...} />`, `<AddChapterDialog unitId={...} subjectId={...} />`

- [ ] **Step 1: Create `src/features/resources/components/add-resource-modal.tsx`**
  Build a clean modal dialog accepting `{ subjectId, subjectName, unitId, unitTitle, chapterId, chapterTitle, targetLabel, trigger }`.
  Provide 3 tabs: **Google Drive / Slides Link**, **File Upload (UploadThing)**, and **Web Link**.
  Pre-fill hidden inputs `subjectId`, `unitId`, `chapterId`.
  Display breadcrumb badge: `Target: Unit 2 › Chapter 2.1`.

- [ ] **Step 2: Create `add-unit-dialog.tsx` and `add-chapter-dialog.tsx` in `src/features/subjects/components/`**
  Extract clean, reusable dialogs from `admin/subjects/[id]/components.tsx` so both Admin and Teacher views can render them.

- [ ] **Step 3: Verify typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/features/resources/components/add-resource-modal.tsx src/features/subjects/components/add-unit-dialog.tsx src/features/subjects/components/add-chapter-dialog.tsx
  git commit -m "feat(resources): create reusable AddResourceModal and extracted syllabus dialogs"
  ```

---

### Task 4: In-Context Editorial Controls on Subject Pages

**Files:**
- Modify: `src/app/(admin)/admin/subjects/[id]/page.tsx:50-136`
- Modify: `src/app/(student)/subjects/[slug]/page.tsx:18-35, 145-210, 400-500`

**Interfaces:**
- Consumes: `AddResourceModal`, `AddUnitDialog`, `AddChapterDialog`
- Produces: Editorial buttons on Unit headers and Chapter items for Admins and assigned Teachers

- [ ] **Step 1: Update `src/app/(admin)/admin/subjects/[id]/page.tsx`**
  Import `AddResourceModal`.
  On each Unit header: render `+ Add Resource to Unit` (secondary pill) next to `Add Chapter`.
  On each Chapter item: render `+ Add Resource to Chapter`.
  Display both unit-level and chapter-level resources under each unit.

- [ ] **Step 2: Update `src/app/(student)/subjects/[slug]/page.tsx` for Teachers**
  Determine if `isEditor = user.role === "ADMIN" || (user.role === "TEACHER" && subject.teacherId === user.teacherId)`.
  If `isEditor`, render:
  - `+ Add Unit` button in header.
  - On each Unit header: `+ Add Resource to Unit` and `+ Add Chapter`.
  - On each Chapter: `+ Add Resource`.
  Fix `ContextHeader` back link: If `user.role === "TEACHER"`, back link routes to `/teacher/subjects`.

- [ ] **Step 3: Verify typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/(admin)/admin/subjects/[id]/page.tsx src/app/(student)/subjects/[slug]/page.tsx
  git commit -m "feat(subjects): enable in-context unit and chapter resource addition for teachers and admins"
  ```

---

### Task 5: Student Presentation: Unit Resources Shelf & Syllabus Badge Deep-linking

**Files:**
- Modify: `src/app/(student)/subjects/[slug]/page.tsx:699-835`

**Interfaces:**
- Consumes: `loadSubjectUnits`, `loadSubjectResources`, `resources.unitId`
- Produces: Unit Resources Shelf inside Unit accordion; combined badge on Syllabus tab

- [ ] **Step 1: Render Unit Resources Shelf inside Unit Accordion**
  In the Resources tab:
  Filter `unitResources = subjectResources.filter(r => r.unitId === unit.id && !r.chapterId)`.
  If `unitResources.length > 0`: render styled shelf at top of unit accordion before sub-chapters with title `📦 Unit Resources & Master Slides (${unitResources.length})`.
  Inside sub-chapters: render chapter-specific resources (`r.chapterId === chapter.id`).
  If a unit has resources but 0 chapters, render the unit shelf prominently.

- [ ] **Step 2: Update Syllabus Tab Summary Badge**
  In `?tab=syllabus`: calculate total materials (`unitResources.length + chapterResources.length`).
  Make badge clickable: links directly to `?tab=resources&unit=${unit.id}`.

- [ ] **Step 3: Verify typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/(student)/subjects/[slug]/page.tsx
  git commit -m "feat(student): add Unit Resources Shelf and syllabus badge deep-linking"
  ```

---

### Task 6: Central Resources Hub Upgrades (`/resources`, `/teacher/resources`, `/admin/resources`)

**Files:**
- Modify: `src/features/resources/components/resource-form.tsx:203-233`
- Modify: `src/features/resources/components/resources-workspace.tsx:18-35, 180-260`
- Modify: `src/app/(student)/resources/resources-client.tsx:1-120`

**Interfaces:**
- Consumes: `ResourceWithDetails.scope`, `ResourceWorkspaceSubject.courseUnits.resources`
- Produces: Clean unit/chapter selector in form; scope badges and quick filter tabs in library

- [ ] **Step 1: Update `ResourceForm` unit/chapter selector**
  Provide clear optgroup choices:
  - `General (Subject-wide)`
  - Grouped by Unit:
    - `Unit X: Title (Whole Unit)` -> sets `unitId = unit.id`, `chapterId = ""`
    - `↳ Chapter X.Y: Title` -> sets `unitId = unit.id`, `chapterId = chapter.id`

- [ ] **Step 2: Update `ResourcesWorkspace` (Teacher & Admin Structured View)**
  Add `unit.resources` to `ResourceWorkspaceSubject` type and query.
  In Structured View accordion: render unit-level resources under each unit header with quick `+ Add Resource` shortcut.

- [ ] **Step 3: Update `ResourcesClient` (Student Central Hub)**
  Display two-tier badges:
  - `[ 📦 Unit 2: Whole Unit ]`
  - `[ 📑 Unit 2 › Chapter 2.1 ]`
  Add scope filter pill tabs above the list: `[ All Files ]`, `[ 📦 Whole Units ]`, `[ 📑 By Chapter ]`, `[ 🌐 General ]`.
  When a Subject is selected from dropdown, show a secondary Unit filter.

- [ ] **Step 4: Verify typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/resources/components/resource-form.tsx src/features/resources/components/resources-workspace.tsx src/app/(student)/resources/resources-client.tsx
  git commit -m "feat(resources): upgrade central hub with scope filters, badges, and unit resources"
  ```

---

### Task 7: Comprehensive Verification & Learnings Closeout

**Files:**
- Create: `scripts/maintenance/verify-unit-resources.ts`
- Modify: `LEARNINGS.md`

**Interfaces:**
- Consumes: Complete unit-based and chapter-based resources flow
- Produces: Test verification evidence & Mistake #36 log in `LEARNINGS.md`

- [ ] **Step 1: Create and run `scripts/maintenance/verify-unit-resources.ts`**
  Verify inserting unit-level resource, chapter-level resource, querying via DAL, and cascade deletion.
  Run: `npx tsx --env-file=.env.local scripts/maintenance/verify-unit-resources.ts`
  Expected: All checks PASS.

- [ ] **Step 2: Clean up verification script**
  Remove `scripts/maintenance/verify-unit-resources.ts` per Codebase Best Practice #1.

- [ ] **Step 3: Run final strict typecheck**
  Run: `npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 4: Update `LEARNINGS.md`**
  Record Mistake #36 on the missing `unit_id` foreign key and syllabus-library fragmentation.

- [ ] **Step 5: Commit**
  ```bash
  git add LEARNINGS.md
  git commit -m "docs(learnings): record unit-level resource scoping invariant and closeout"
  ```
