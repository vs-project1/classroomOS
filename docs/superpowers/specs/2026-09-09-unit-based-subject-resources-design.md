# Design Specification: Unit-Based and Chapter-Based Subject Resources

**Specification Date:** 2026-09-09  
**Status:** Approved by User  
**Milestone:** M1 / M5 Alignment & Enhancement  
**Target Roles:** Teacher, Student, Admin  

---

## 1. Executive Summary & Problem Statement

### The Problem
In Nepali BCA and engineering colleges, academic materials are organized around a syllabus hierarchy: **Subject → Units (Syllabus Units) → Chapters (Lectures)**. Currently in Classroom OS:
1. The `resources` database table only has `subject_id` and `chapter_id`, but **no `unit_id` column**.
2. When faculty upload unit-level materials (such as comprehensive unit slides, past question banks, or syllabus guidelines), the system employs an internal hack that forcibly attaches the file to the unit's *first chapter*, or auto-generates a dummy chapter titled after the unit.
3. Teachers cannot manage or upload resources directly within their subject curriculum view (`/subjects/[slug]`). The subject page is strictly read-only for syllabus materials, while the central `/teacher/resources` page requires multi-step dropdown selection.
4. Students viewing a subject have no designated home for unit-wide materials. If a unit has no sub-chapters yet, students are presented with an empty dead-end state (`No chapters in this unit`), hiding uploaded unit resources.
5. There is historical data fragmentation between the legacy `course_materials` table and the modern `resources` table.

### Goals
1. Add first-class `unit_id` support to the `resources` table, establishing clean 3-tier scoping (`Subject-Wide`, `Unit-Level`, `Chapter-Level`).
2. Provide in-context editorial controls on the Subject view for Teachers and Admins:
   - `+ Add Unit` at the top of curriculum.
   - `+ Add Resource to Unit` and `+ Add Chapter` on every Unit header.
   - `+ Add Resource to Chapter` on every Chapter item.
3. Provide a dedicated **"Unit Resources Shelf"** at the top of each Unit accordion in the Student view (`/subjects/[slug]`) before sub-chapters.
4. Enhance the central Resources Hub (`/resources` & `/teacher/resources`) with clear scope badges, quick scope filter tabs (`Whole Units`, `By Chapter`, `General`), and dynamic subject-to-unit filters.
5. Unify data access so all curriculum materials appear seamlessly across both the Subject view and the Central Library.

### Explicit Non-Goals
- Changing the handwritten homework model (remains notebook-based).
- Altering the daily roll call attendance ledger.
- Replacing UploadThing or Google Drive embedding engines.

---

## 2. Database Schema & Migration Strategy

### 2.1 Schema Definition (`src/db/schema.ts`)
Update the `resources` table to add `unit_id`:

```ts
export const resources = sqliteTable("resources", {
  id: text("id").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  unitId: text("unit_id")
    .references(() => courseUnits.id, { onDelete: "set null" }), // NEW: Direct unit link
  chapterId: text("chapter_id")
    .references(() => courseChapters.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // 'pdf' | 'slides' | 'link' | 'zip' | 'code' | 'doc' | 'image' | 'text'
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by")
    .references(() => teachers.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => [
  index("idx_resources_subject").on(table.subjectId),
  index("idx_resources_unit").on(table.unitId), // NEW
  index("idx_resources_chapter").on(table.chapterId),
  index("idx_resources_chapter_created").on(table.chapterId, table.createdAt),
  index("idx_resources_uploaded_by").on(table.uploadedBy),
]);
```

### 2.2 Relational Mappings
```ts
export const courseUnitsRelations = relations(courseUnits, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [courseUnits.subjectId],
    references: [subjects.id],
  }),
  courseChapters: many(courseChapters),
  resources: many(resources), // NEW: Direct relation
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  subject: one(subjects, {
    fields: [resources.subjectId],
    references: [subjects.id],
  }),
  unit: one(courseUnits, { // NEW
    fields: [resources.unitId],
    references: [courseUnits.id],
  }),
  chapter: one(courseChapters, {
    fields: [resources.chapterId],
    references: [courseChapters.id],
  }),
  uploadedByTeacher: one(teachers, {
    fields: [resources.uploadedBy],
    references: [teachers.id],
  }),
}));
```

### 2.3 Automated Database Migration
Add schema synchronization step in `scripts/maintenance/migrate-schema-sync.ts`:
```ts
const tableInfo = await client.execute("PRAGMA table_info(resources)");
const columns = tableInfo.rows.map((r) => r.name as string);
if (!columns.includes("unit_id")) {
  await client.execute("ALTER TABLE resources ADD COLUMN unit_id TEXT REFERENCES course_units(id)");
}
```

---

## 3. Data Access Layer (DAL) & Server Actions

### 3.1 Server Action Contract: `createResourceAction`
Update `createResourceSchema` in `src/features/resources/actions/resources.ts`:
```ts
const createResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  unitId: z.string().nullable().optional(),
  chapterId: z.string().nullable().optional(),
  fileUrl: z.url("Must be a valid URL"),
  fileType: z.enum(["pdf", "slides", "link", "zip", "code", "doc", "image", "text"]),
  description: z.string().trim().optional(),
  fileSize: z.coerce.number().int().positive().optional(),
  fileKey: z.string().optional(),
});
```

**Execution Flow:**
1. Validate authorization: `requireAuth(["TEACHER", "ADMIN"])`. If Teacher, verify subject assignment.
2. If `chapterId` is passed, automatically verify and ensure `unitId` matches `courseChapters.unitId`.
3. If only `unitId` is passed (no `chapterId`), insert directly with `unitId: unitId, chapterId: null`. Remove the legacy dummy chapter creation hack.
4. If neither is passed, record as Subject-wide (`unitId: null, chapterId: null`).
5. Send notifications via `notifyMany` to enrolled students.
6. Trigger multi-role cache invalidations:
   - `revalidatePath("/admin/resources")`
   - `revalidatePath("/teacher/resources")`
   - `revalidatePath("/resources")`
   - `revalidatePath("/subjects")`

### 3.2 DAL Return Types (`src/features/resources/queries.ts`)
Extend `ResourceWithDetails`:
```ts
export type ResourceWithDetails = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  createdAt: Date | null;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectSlug: string;
  unitId: string | null;       // NEW
  unitTitle: string | null;    // NEW
  unitOrder: number | null;    // NEW
  chapterId: string | null;
  chapterTitle: string | null;
  teacherName: string | null;
  scope: "SUBJECT" | "UNIT" | "CHAPTER"; // NEW: Computed scope
};
```

---

## 4. UI / UX Design & Component Architecture

### 4.1 In-Context Subject Action Buttons (`AddResourceModal`)
A reusable modal component placed in `src/features/resources/components/add-resource-modal.tsx`:

```tsx
<AddResourceModal
  subjectId={subject.id}
  subjectName={subject.name}
  unitId={unit.id}
  unitTitle={unit.title}
  chapterId={chapter?.id}
  chapterTitle={chapter?.title}
  trigger={...}
/>
```

- **Visual Header:** Displays breadcrumbs: `Database Management Systems › Unit 2: Relational Model` (or `› Chapter 2.1: Normalization`).
- **3 Tab Modes:**
  1. **Google Drive / Google Slides (Default):** Paste link; parses URL with `parseGoogleDriveUrl()` to enable embedded presentation preview.
  2. **File Upload (UploadThing):** Dropzone accepting PDF, DOCX, ZIP, Code, or Images. Auto-detects `fileType` and pre-fills title.
  3. **Web Link:** For YouTube links, GitHub repos, or documentation.

### 4.2 Subject Page Editorial Layout (`/subjects/[slug]` & `/admin/subjects/[id]`)
- When user is **Admin** or the **Assigned Teacher**:
  - Top bar right side: **`+ Add Unit`** button.
  - On each Unit Header:
    - Left: Unit Order Badge, Unit Title, resource count summary.
    - Right (action group):
      - **`+ Add Resource to Unit`** (secondary button with paperclip icon).
      - **`+ Add Chapter`** (outline button).
  - On each Chapter Item:
    - Left: Chapter Title, coverage status toggle.
    - Right: **`+ Add Resource`** (subtle icon button).

### 4.3 Student View (`/subjects/[slug]`): The Unit Resources Shelf
Inside each Unit accordion in the Resources tab:
1. **Unit Resources Shelf (Top Section):**
   - Renders when `resources.filter(r => r.unitId === unit.id && !r.chapterId).length > 0`.
   - Card grid with prominent file type badges, preview links, and teacher attribution.
2. **Sub-Chapters (Bottom Section):**
   - Listed in syllabus order, containing specific chapter worksheets and notes.
3. **Empty Sub-Chapters Handling:**
   - If unit-level resources exist but zero chapters are defined yet, the shelf displays cleanly with a helpful status badge instead of a dead-end message.

### 4.4 Central Resources Hub (`/resources` & `/teacher/resources`)
- **Metadata Badges on Cards:**
  - `[ 📦 Unit 2: OOP (Whole Unit) ]` (amber badge)
  - `[ 📑 Unit 2 › Chapter 2.1: Constructors ]` (muted badge)
  - `[ 🌐 General Reference ]` (slate badge)
- **Quick Scope Filter Tabs:**
  `[ All Files (32) ]` • `[ 📦 Whole Units (12) ]` • `[ 📑 By Chapter (16) ]` • `[ 🌐 General (4) ]`
- **Cascading Filter:** Selecting a Subject opens an optional secondary Unit filter dropdown.

---

## 5. Role Authorization & Access Control

1. **Upload Permissions:**
   - `ADMIN`: Permitted to add units, chapters, and resources across all subjects.
   - `TEACHER`: Permitted to add units, chapters, and resources ONLY on subjects where `subject.teacherId === teacher.id`.
   - `STUDENT` & `CR`: Strictly read-only; no creation buttons rendered or server actions authorized.
2. **Read Permissions:**
   - `STUDENT` & `CR`: Must be enrolled in the subject or enrolled in the corresponding semester cohort.
   - `TEACHER` & `ADMIN`: Access granted to all assigned/institutional resources.

---

## 6. Verification & Quality Gates

1. **Database Migration Gate:** Verify SQLite schema sync runs without constraint errors (`npm run db:sync`).
2. **Typecheck Gate:** Strict zero errors with `npx tsc --noEmit`.
3. **Functional End-to-End Tests:**
   - Teacher adds resource to Unit 1 directly from Subject view.
   - Teacher adds resource to Chapter 1.1 directly from Subject view.
   - Verify student sees Unit 1 resource in the Unit Resources Shelf.
   - Verify student sees Chapter 1.1 resource under Chapter 1.1.
   - Verify both appear on the Central Library (`/resources`) with correct two-tier badges.
4. **Learnings Log:** Append findings and design invariants to `LEARNINGS.md`.
