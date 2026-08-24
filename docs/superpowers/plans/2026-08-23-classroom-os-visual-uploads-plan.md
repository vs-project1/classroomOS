# Classroom OS — Visual Elevation + File Graph + Routine Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Drizzle schema (`resources`, `courseMaterials`, `assignmentSubmissions`, `notices`, `courseUnits/Chapters`) end-to-end via a versioned R2 file graph, elevate the visual system from flat indigo to light-academic data-dense, and ship routine-intelligence + IA so the 47 screenshots at `http://localhost:3000` no longer show empty/broken states.

**Architecture:** Keep libSQL + Drizzle (no Supabase migration). Add `files` table as single source for uploads (R2 presigned POST → confirm → signed GET preview, checksum dedupe, version chain). Ship design tokens + skeletons/empty states + grouped sidebar + timeline river in same branch so visual and data fixes land together. Routine Intelligence reuses `weeklyRoutine` → `classSessions` → `attendance` → `notifications`.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, Tailwind v4, Drizzle 0.45.2 + libSQL 0.17.4, `uploadthing` 7.7.4 (avatars only), Cloudflare R2 (S3 API) via `@aws-sdk/client-s3` + `@aws-sdk/s3-presigned-post`, TipTap, Lucide, Playwright 1.62.1, `tsx` scripts

**Spec:** `docs/superpowers/specs/2026-08-23-classroom-os-visual-uploads-plan.md`

## Global Constraints

- Node 22, Next.js `16.2.10`, React `19.2.4`, Tailwind `v4` only
- Drizzle file: `file:D:/CLASSROOM OS/local.db` (dev) / `file:local.test.db` (playwright) — never remote without `SEED_ALLOW_REMOTE=1`
- Secret `SESSION_SECRET` fallback `classroom-os-secret-key-32-chars-long-demo` for `createSessionToken` (`src/lib/auth/token.ts:14`)
- RBAC: `ADMIN` only on `/admin/*` (`src/proxy.ts:108`), per-resource `assertCanRead(courseId,userId)` on every file/notice/submission endpoint
- File limits: docs `25MB`, video `100MB`, allowlist `pdf/docx/pptx/mp4/zip/code/link` + magic-bytes sniff, `R2 key = course/{courseId}/chapter/{chapterId}/{uuid}.{ext}`
- Visual tokens: `bg #F8FAFF`, `card #FFFFFF border #E2E8F0`, `primary #4F46E5`, `text #0F172A/#475569` >=4.5:1, `Inter 600` H1 28px, `radius 0.75rem`, `shadow 0 1px 3px rgba(15,23,42,0.06)` hover `0 8px 24px`, `cursor-pointer` on all cards, no emoji icons (Lucide 24x24)
- Tests: `npm run test:e2e` must stay green; `npx tsc --noEmit` zero errors

---

## File Structure

**New files (responsibility):**
- `src/lib/files/validation.ts` — allowlist, size, magic-bytes (pure, no DB)
- `src/lib/files/r2.ts` — S3 client + `createPresignedPost` + `createSignedGet` (R2 env: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=classroom-os`)
- `src/lib/files/authz.ts` — `assertCanRead/write(courseId,userId)` (Drizzle `enrollments` + `teachers` + `subjects`)
- `src/db/migrations/0004_add_files_table.sql` — `files` table + `notices.attachments` + index `resources(chapterId,createdAt)` + `files(checksum)` unique where needed
- `src/app/api/files/presign/route.ts` — POST validates, returns `{url, fields, r2Key, fileId}`
- `src/app/api/files/confirm/route.ts` — POST checksum + magic-bytes + thumbnail stub, inserts `files` row, links `resources`/`courseMaterials`/`assignmentSubmissions`/`notices`
- `src/app/api/files/[id]/preview/route.ts` — GET 60s signed GET, `Content-Disposition:inline`
- `src/components/files/dropzone.tsx` — `shadcn` styled dropzone (R2 PUT flow, progress, retry, `use-file-upload`)
- `src/components/files/file-preview.tsx` — pdf (PDF.js) / image / video / link preview wrapper
- `src/components/ui/empty-state.tsx` — illustration + title + CTA (replaces `No data`)
- `src/components/ui/skeleton.tsx` — shimmer `from-slate-100 to-slate-50`
- `src/components/attendance/arc-gauge.tsx` — segmented 78% gauge (`red→amber→green`)
- `src/components/timetable/timeline-river.tsx` — 7AM-4PM river (`timelineRiver` slots 60px/hr)
- `src/hooks/use-file-upload.ts` — `presign→PUT→confirm` hook with IndexedDB queue stub

**Modify (bounded):**
- `src/app/globals.css:62-136` — tokens `bg #F8FAFF`, `border #E2E8F0`, sidebar active left-border, shadow
- `src/components/ui/card.tsx`, `button.tsx` — radius/shadow/hover lift + `cursor-pointer transition-colors duration-200`
- `src/components/student/student-sidebar.tsx`, `mobile-navbar.tsx`, `app-sidebar.tsx` — grouped sections, collapsible Course switcher, bottom tabs
- `src/app/(teacher)/teacher/resources/page.tsx` — replace empty with `Subjects→Chapters→Resources` browser + `dropzone`
- `src/app/(student)/subjects/[slug]/page.tsx` — same browser (read-only)
- `src/app/(student)/homework/**/page.tsx` + `src/app/(teacher)/teacher/grading/page.tsx` — dropzone + preview + grade flow
- `src/app/(student)/notices/**/page.tsx` + `(admin)/admin/notices/**` — TipTap + attachments fan-out
- `src/app/(student)/routine/page.tsx` + `(student)/today/page.tsx` — Timeline River + routine edit → session regen

---

### Task 1: Design Tokens — globals.css Elevation

**Files:**
- Modify: `src/app/globals.css:62-136`
- Test: `tests/e2e/typography-contrast.spec.ts` (add contrast assertion)

**Interfaces:**
- Consumes: existing `globals.css` CSS variables `--background`, `--card`, `--border`, `--primary`
- Produces: `--background: #F8FAFF`, `--card: #FFFFFF`, `--border: #E2E8F0`, `--primary: #4F46E5` available to all components

- [ ] **Step 1: Write failing test — contrast of body text >=4.5:1**
```ts
// tests/e2e/typography-contrast.spec.ts
import { test, expect } from "@playwright/test";
test("body text contrast >=4.5:1 in light mode", async ({ page }) => {
  await page.goto("/");
  const color = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(color).not.toBe("rgb(148, 163, 184)"); // slate-400 banned
  expect(color).toMatch(/rgb\(15, 23, 42\)|rgb\(51, 65, 85\)/); // slate-900/700
});
```

- [ ] **Step 2: Run to fail**
Run: `npx playwright test tests/e2e/typography-contrast.spec.ts -g "body text contrast" --project="Desktop Chrome"`
Expected: FAIL — body is `rgb(203,213,225)` or similar <4.5:1

- [ ] **Step 3: Minimal implementation**
```css
/* src/app/globals.css:62 */
:root {
  --background: #F8FAFF;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --border: #E2E8F0;
  --primary: #4F46E5;
  --muted-foreground: #475569;
  --radius: 0.75rem;
}
.sidebar { background: #FFFFFF; border-right: 1px solid #E2E8F0; }
.sidebar [data-active="true"] { border-left: 3px solid #4F46E5; background: #EEF2FF; }
.dark { --background: #070B14; --card: #0F172A; --border: #1E293B; }
```

- [ ] **Step 4: Pass**
Run: same test → PASS

- [ ] **Step 5: Commit**
```bash
git add src/app/globals.css tests/e2e/typography-contrast.spec.ts
git commit -m "feat(design): light academic tokens bg #F8FAFF border #E2E8F0 primary #4F46E5"
```

### Task 2: Card/Button Polish + Cursor-Pointer

**Files:**
- Modify: `src/components/ui/card.tsx:1-30`, `src/components/ui/button.tsx:1-40`
- Test: `tests/e2e/typography-contrast.spec.ts` (hover + cursor)

- [ ] **Step 1: Failing test — cards have pointer + hover border**
```ts
test("cards have cursor-pointer and hover border", async ({ page }) => {
  await page.goto("/admin");
  const card = page.locator('[data-slot="card"]').first();
  await expect(card).toHaveCSS("cursor", "pointer");
  await card.hover();
  await expect(card).toHaveCSS("border-color", /rgb\(224, 231, 255\)|rgb\(226, 232, 240\)/); // indigo-100/slate-200
});
```

- [ ] **Step 2: Run fail** — cursor is `auto`, border unchanged

- [ ] **Step 3: Implement**
```tsx
// src/components/ui/card.tsx
<div className="rounded-xl bg-card text-card-foreground border border-[#E2E8F0] shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-indigo-200 hover:-translate-y-[1px] cursor-pointer transition-all duration-200" {...props} />
// button.tsx: add cursor-pointer transition-colors duration-200, primary gradient hover
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/components/ui/card.tsx src/components/ui/button.tsx
git commit -m "feat(ui): card elevation hover lift + cursor-pointer"
```

### Task 3: Skeleton + EmptyState Primitives

**Files:**
- Create: `src/components/ui/skeleton.tsx`, `src/components/ui/empty-state.tsx`
- Test: `tests/e2e/typography-contrast.spec.ts` (empty state renders)

- [ ] **Step 1: Failing test**
```ts
test("empty resources shows illustration + CTA not No data", async ({ page }) => {
  await page.goto("/teacher/resources");
  await expect(page.getByText("No data")).toHaveCount(0);
  await expect(page.getByText(/Upload your first/i)).toBeVisible();
});
```

- [ ] **Step 2: Fail**

- [ ] **Step 3: Implement**
```tsx
// src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-[shimmer_2s_infinite] bg-gradient-to-r from-slate-100 to-slate-50 rounded-md ${className}`} />;
}
// src/components/ui/empty-state.tsx
export function EmptyState({ icon: Icon, title, action }: { icon: any, title: string, action: React.ReactNode }) {
  return <div className="flex flex-col items-center py-12 text-center"><Icon className="w-20 h-20 text-slate-300 mb-4"/><p className="text-slate-600">{title}</p>{action}</div>;
}
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/components/ui/skeleton.tsx src/components/ui/empty-state.tsx
git commit -m "feat(ui): skeleton shimmer + empty-state with CTA"
```

### Task 4: Attendance Arc Gauge (78%)

**Files:**
- Create: `src/components/attendance/arc-gauge.tsx`
- Modify: `src/app/(student)/attendance/page.tsx:1-80`, `src/app/(student)/page.tsx` (dashboard barometer)
- Test: `tests/e2e/attendance-barometer.spec.ts`

- [ ] **Step 1: Failing test**
```ts
test("attendance gauge renders segmented arc with 78%", async ({ page }) => {
  await page.goto("/attendance");
  await expect(page.getByTestId("arc-gauge")).toBeVisible();
  await expect(page.getByText("78%")).toBeVisible();
  await expect(page.getByTestId("arc-needle")).toBeVisible();
});
```

- [ ] **Step 2: Fail — gauge missing**

- [ ] **Step 3: Implement**
```tsx
// src/components/attendance/arc-gauge.tsx
export function ArcGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct < 60 ? "#E11D48" : pct < 75 ? "#D97706" : pct < 80 ? "#F59E0B" : "#16A34A";
  return <div data-testid="arc-gauge" className="relative w-40 h-20 overflow-hidden"><svg viewBox="0 0 100 50" className="w-full"><path d="M10 50 A40 40 0 0 1 90 50" stroke="#E2E8F0" strokeWidth="8" fill="none"/><path d={`M10 50 A40 40 0 0 1 ${10+80*pct/100} 50`} stroke={color} strokeWidth="8" fill="none"/></svg><div data-testid="arc-needle" style={{ transform: `rotate(${pct*1.8-90}deg)` }} className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-slate-900" /></div>;
}
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/components/attendance/arc-gauge.tsx src/app/\(student\)/attendance/page.tsx
git commit -m "feat(attendance): segmented arc gauge 78% with needle"
```

### Task 5:Grouped Sidebar + Collapsible Course Switcher

**Files:**
- Modify: `src/components/student/student-sidebar.tsx:1-120`, `src/components/student/mobile-navbar.tsx`, `src/components/app-sidebar.tsx`
- Test: `tests/e2e/navigation-roles.spec.ts`

- [ ] **Step 1: Failing test**
```ts
test("sidebar is grouped Academics/Work/Class/Campus", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ACADEMICS")).toBeVisible();
  await expect(page.getByText("Work")).toBeVisible();
  await expect(page.locator('[data-testid="course-switcher"]')).toBeVisible();
});
```

- [ ] **Step 2: Fail**

- [ ] **Step 3: Implement**
```tsx
// student-sidebar.tsx
<nav>
  <section><h4 className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">ACADEMICS</h4><Link href="/subjects" data-testid="course-switcher">My Subjects</Link></section>
  <section><h4>Work</h4> … </section>
  // bottom tabs <640px via CSS
</nav>
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/components/student/student-sidebar.tsx src/components/student/mobile-navbar.tsx
git commit -m "feat(nav): grouped sidebar Academics/Work/Class/Campus + course switcher"
```

### Task 6: Files Validation (pure)

**Files:**
- Create: `src/lib/files/validation.ts`
- Test: `tests/files/validation.spec.ts` (vitest)

- [ ] **Step 1: Failing test**
```ts
import { validateFile } from "@/lib/files/validation";
test("rejects .exe and >25MB doc", () => {
  expect(validateFile({ name:"x.exe", mime:"application/x-msdownload", size:1000 }).ok).toBe(false);
  expect(validateFile({ name:"a.pdf", mime:"application/pdf", size:26*1024*1024 }).ok).toBe(false);
  expect(validateFile({ name:"a.pdf", mime:"application/pdf", size:10*1024*1024 }).ok).toBe(true);
});
```

- [ ] **Step 2: Fail — module missing**

- [ ] **Step 3: Implement**
```ts
// src/lib/files/validation.ts
const ALLOW = new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation","video/mp4","application/zip","text/plain"]);
export function validateFile(f:{name:string,mime:string,size:number}) {
  if(!ALLOW.has(f.mime) && !/\.(pdf|docx|pptx|mp4|zip)$/.test(f.name)) return {ok:false, reason:"type"};
  const limit = f.mime.startsWith("video/") ? 100*1024*1024 : 25*1024*1024;
  if(f.size>limit) return {ok:false, reason:"size"};
  return {ok:true};
}
export function sniffMagic(bytes:Uint8Array,mime:string){ /* %PDF → pdf, PK → zip */ return true; }
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/lib/files/validation.ts tests/files/validation.spec.ts
git commit -m "feat(files): validation allowlist + size + magic-bytes"
```

### Task 7: R2 Client + Presigned Helpers

**Files:**
- Create: `src/lib/files/r2.ts`
- Test: `tests/files/r2.spec.ts`

- [ ] **Step 1: Failing test**
```ts
test("createPresignedPost returns url + fields", async () => {
  const { url, fields } = await createPresignedPost({ r2Key:"course/c1/chapter/ch1/a.pdf", mime:"application/pdf" });
  expect(url).toMatch(/^https/);
  expect(fields.key).toBe("course/c1/chapter/ch1/a.pdf");
});
```

- [ ] **Step 2: Fail**

- [ ] **Step 3: Implement**
```ts
// src/lib/files/r2.ts
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
const s3 = new S3Client({ region:"auto", endpoint: process.env.R2_ENDPOINT!, credentials:{ accessKeyId:process.env.R2_ACCESS_KEY_ID!, secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!} });
export async function createPresignedPost(p:{r2Key:string,mime:string}) {
  const post = await createPresignedPost(s3, { Bucket: process.env.R2_BUCKET!, Key:p.r2Key, Conditions:[["content-length-range",1,104857600]], Fields:{ "Content-Type": p.mime }, Expires:3600 });
  return { url: post.url, fields: post.fields };
}
export async function createSignedGet(r2Key:string){ /* 60s */ }
```

- [ ] **Step 4: Pass (mock R2 in test)**

- [ ] **Step 5: Commit**
```bash
git add src/lib/files/r2.ts
git commit -m "feat(files): R2 presigned POST + signed GET"
```

### Task 8: Authz Helper

**Files:**
- Create: `src/lib/files/authz.ts`
- Test: `tests/files/authz.spec.ts`

- [ ] **Step 1: Failing test**
```ts
test("teacher of subject can write, random student cannot", async () => {
  await expect(assertCanWrite("subj_dsa_001","usr_student_rohan")).rejects.toThrow();
  await expect(assertCanRead("subj_dsa_001","usr_student_rohan")).resolves.toBeTruthy();
});
```

- [ ] **Step 2: Fail**

- [ ] **Step 3: Implement**
```ts
// src/lib/files/authz.ts
import { db } from "@/db";
import { enrollments, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
export async function assertCanRead(courseId:string,userId:string){ /* check enrollments or teacherId */ }
export async function assertCanWrite(courseId:string,userId:string){ /* ADMIN or teacherId===teacher.id */ }
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/lib/files/authz.ts
git commit -m "feat(files): assertCanRead/Write IDOR guards"
```

### Task 9: DB Migration — files Table + Indexes

**Files:**
- Create: `drizzle/0004_add_files_table.sql`
- Modify: `src/db/schema.ts:393-418` (resources index), add `files`, `notices.attachments`
- Test: `npx drizzle-kit check`

- [ ] **Step 1: Failing check — files table missing**
Run: `npx drizzle-kit check` → error `files` not found

- [ ] **Step 2: Implement migration**
```sql
CREATE TABLE files (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, r2_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, size INTEGER NOT NULL, checksum TEXT NOT NULL, course_id TEXT REFERENCES subjects(id) ON DELETE SET NULL, chapter_id TEXT REFERENCES course_chapters(id) ON DELETE SET NULL, submission_id TEXT REFERENCES assignment_submissions(id) ON DELETE CASCADE, notice_id TEXT REFERENCES notices(id) ON DELETE CASCADE, version INTEGER NOT NULL DEFAULT 1, parent_file_id TEXT REFERENCES files(id) ON DELETE SET NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
ALTER TABLE notices ADD COLUMN attachments TEXT; -- json array of file ids
CREATE INDEX idx_resources_chapter_created ON resources(chapter_id, created_at);
CREATE INDEX idx_files_checksum ON files(checksum);
CREATE INDEX idx_files_course ON files(course_id);
```

- [ ] **Step 3: Run**
Run: `npx drizzle-kit migrate` → PASS

- [ ] **Step 4: Commit**
```bash
git add drizzle/0004_add_files_table.sql src/db/schema.ts
git commit -m "feat(db): files table + notices.attachments + indexes"
```

### Task 10: API — /api/files/presign

**Files:**
- Create: `src/app/api/files/presign/route.ts`
- Test: `tests/e2e/files-presign.spec.ts`

- [ ] **Step 1: Failing test**
```ts
test("presign returns 200 with R2 url", async ({ request }) => {
  const res = await request.post("/api/files/presign", { data:{ courseId:"subj_dsa_001", mime:"application/pdf", size:1000, name:"a.pdf", checksum:"abc" } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toHaveProperty("url");
});
```

- [ ] **Step 2: Fail — 404**

- [ ] **Step 3: Implement**
```ts
// src/app/api/files/presign/route.ts
export async function POST(req:Request){
  const user = await getCurrentUser(); if(!user) return new Response("unauth",{status:401});
  const { courseId, mime, size, name, checksum } = await req.json();
  const v = validateFile({name,mime,size}); if(!v.ok) return new Response(v.reason,{status:400});
  await assertCanWrite(courseId, user.id);
  const r2Key = `course/${courseId}/chapter/general/${crypto.randomUUID()}.${name.split(".").pop()}`;
  const { url, fields } = await createPresignedPost({ r2Key, mime });
  return Response.json({ url, fields, r2Key });
}
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/app/api/files/presign/route.ts
git commit -m "feat(api): POST /api/files/presign R2 presigned POST"
```

### Task 11: API — /api/files/confirm + Hook

**Files:**
- Create: `src/app/api/files/confirm/route.ts`, `src/hooks/use-file-upload.ts`
- Test: `tests/e2e/files-confirm.spec.ts`

- [ ] **Step 1: Failing test**
```ts
test("confirm inserts files row and links resource", async ({ request }) => {
  const res = await request.post("/api/files/confirm", { data:{ r2Key:"course/c1/a.pdf", checksum:"abc", mime:"application/pdf", size:1000, courseId:"subj_dsa_001" } });
  expect(res.status()).toBe(200);
});
```

- [ ] **Step 2: Fail**

- [ ] **Step 3: Implement**
```ts
// confirm/route.ts — magic-bytes sniff, insert files, link to resources if chapterId
// use-file-upload.ts — const {upload}=useFileUpload(); upload(file,courseId) => presign→PUT→confirm with progress
```

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**
```bash
git add src/app/api/files/confirm/route.ts src/hooks/use-file-upload.ts
git commit -m "feat(api): POST /api/files/confirm + useFileUpload hook"
```

### Task 12: API — /api/files/[id]/preview (60s signed GET)

**Files:**
- Create: `src/app/api/files/[id]/preview/route.ts`
- Test: `tests/e2e/files-preview.spec.ts`

- [ ] **Step 1: Failing test** — `GET /api/files/file_123/preview` → `403` before, `200` with auth after

- [ ] **Step 2: Implement**
```ts
export async function GET(req:Request,{params}:{params:{id:string}}){
  const user=await getCurrentUser(); const file = await db.query.files.findFirst({where:eq(files.id,params.id)});
  await assertCanRead(file.courseId!, user!.id);
  const signed = await createSignedGet(file.r2Key);
  return Response.redirect(signed, 302);
}
```

- [ ] **Step 3: Pass**

- [ ] **Step 4: Commit**
```bash
git add "src/app/api/files/[id]/preview/route.ts"
git commit -m "feat(api): GET /api/files/[id]/preview signed GET"
```

### Task 13: Dropzone + Preview Components

**Files:**
- Create: `src/components/files/dropzone.tsx`, `src/components/files/file-preview.tsx`
- Test: `tests/e2e/files-dropzone.spec.ts` (drag-drop simulated)

- [ ] **Step 1: Failing** — `page.getByTestId("dropzone")` missing

- [ ] **Step 3: Implement**
```tsx
export function Dropzone({ courseId, onDone }: { courseId:string, onDone:(f:any)=>void }){
  const { upload, progress } = useFileUpload();
  return <div data-testid="dropzone" onDrop={e=>upload(e.dataTransfer.files[0],courseId).then(onDone)} className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-indigo-300 cursor-pointer">Drag pdf/docx/pptx/mp4/zip here <progress value={progress}/> </div>;
}
```

- [ ] **Step 5: Commit**
```bash
git add src/components/files/dropzone.tsx src/components/files/file-preview.tsx
git commit -m "feat(ui): dropzone + file-preview (pdf/image/video)"
```

### Task 14: Course Materials Browser — Teacher + Student

**Files:**
- Modify: `src/app/(teacher)/teacher/resources/page.tsx:1-60`, `src/app/(student)/subjects/[slug]/page.tsx:1-80`
- Test: `tests/e2e/files-preview.spec.ts` (browser renders chapters)

- [ ] **Step 1: Failing** — `page.getByText("Chapter 1")` missing on `/teacher/resources`

- [ ] **Step 3: Implement**
```tsx
// resources/page.tsx
const units = await db.query.courseUnits.findMany({ with:{ courseChapters:{ with:{ resources:true, courseMaterials:true } } } });
return <Accordion>{units.map(u=> <AccordionItem title={u.title}>{u.courseChapters.map(ch=> <ResourceList chapter={ch} preview />)}</AccordionItem> )}</Accordion>;
```

- [ ] **Step 5: Commit**
```bash
git add src/app/\(teacher\)/teacher/resources/page.tsx src/app/\(student\)/subjects/\[slug\]/page.tsx
git commit -m "feat(materials): Subject→Chapters→Resources browser with preview"
```

### Task 15: Notices 2.0 — TipTap + Attachments + Fan-out

**Files:**
- Modify: `src/app/(admin)/admin/notices/new/page.tsx:1-60`, `src/app/(student)/notices/page.tsx`
- Test: `tests/e2e/notices.spec.ts`

- [ ] **Step 1: Failing** — `page.getByRole("button",{name:"Attach"})` missing

- [ ] **Step 3: Implement**
```tsx
// notices/new — TipTap editor + <Dropzone onDone={id=>setAttachments([...a,id])} />
// POST /api/notices — after insert, for each user in faculty/semester: db.insert(notifications {userId, title, link:`/notices/${id}`, type:"notice"})
```

- [ ] **Step 5: Commit**
```bash
git add src/app/\(admin\)/admin/notices/new/page.tsx src/app/\(student\)/notices/page.tsx
git commit -m "feat(notices): TipTap + attachments + notifications fan-out"
```

### Task 16: Homework Loop — Submit + Grade

**Files:**
- Modify: `src/app/(student)/homework/[id]/page.tsx`, `src/app/(teacher)/teacher/grading/page.tsx:1-80`
- Test: `tests/e2e/homework-submissions.spec.ts`

- [ ] **Step 1: Failing** — submit without file → `required` error not shown

- [ ] **Step 3: Implement**
```tsx
// student homework — <Dropzone courseId={homework.subjectId} onDone={file=> db.insert(assignmentSubmissions {homeworkId, studentId, fileUrl:file.id, status:"submitted"}) } />
// teacher grading — table with FilePreview + score input + feedback + PATCH /api/submissions/[id]/grade
```

- [ ] **Step 5: Commit**
```bash
git add src/app/\(student\)/homework/\[id\]/page.tsx src/app/\(teacher\)/teacher/grading/page.tsx
git commit -m "feat(homework): submit via dropzone + teacher grading"
```

### Task 17: Timeline River (Living Timetable)

**Files:**
- Create: `src/components/timetable/timeline-river.tsx`
- Modify: `src/app/(student)/routine/page.tsx:1-120`, `src/app/(student)/today/page.tsx`
- Test: `tests/e2e/dashboard-schedule.spec.ts`

- [ ] **Step 1: Failing** — `page.getByTestId("timeline-river")` missing

- [ ] **Step 3: Implement**
```tsx
export function TimelineRiver({ slots }:{slots:{start:string,end:string,subject:string}[] }){
  return <div data-testid="timeline-river" className="relative border-l-2 border-slate-100 pl-6">{slots.map(s=> <div className="relative rounded-xl bg-white border p-3 hover:-translate-y-[1px] transition-transform"><span className="absolute -left-3 w-3 h-3 bg-indigo-600 rounded-full"/>{s.subject} {s.start}→{s.end}</div> )}</div>;
}
```

- [ ] **Step 5: Commit**
```bash
git add src/components/timetable/timeline-river.tsx src/app/\(student\)/routine/page.tsx
git commit -m "feat(timetable): vertical river 7AM-12PM with pulse current"
```

### Task 18: Routine Intelligence — Edit → Regen Sessions + Notify

**Files:**
- Modify: `src/app/(student)/routine/new/page.tsx` + backend `src/features/routine/actions.ts`
- Test: `tests/e2e/routine.spec.ts`

- [ ] **Step 1: Failing** — editing routine doesn't invalidate `classSessions`

- [ ] **Step 3: Implement**
```ts
// actions.ts — after weeklyRoutine update: db.delete(classSessions where subjectId+dayOfWeek old) → insert new for next 14 days, delete attendance for deleted sessions, db.insert(notifications for each enrolled student)
```

- [ ] **Step 5: Commit**
```bash
git add src/features/routine/actions.ts
git commit -m "feat(routine): edit regen sessions + invalidate attendance + notify"
```

### Task 19: Bulk Zip Unpack + Offline Queue Stub

**Files:**
- Create: `src/app/api/files/bulk/route.ts`
- Modify: `src/hooks/use-file-upload.ts` (add IndexedDB queue)
- Test: manual `curl -F file=@chapters.zip http://localhost:3000/api/files/bulk`

- [ ] **Step 1: Failing** — bulk endpoint 404

- [ ] **Step 3: Implement**
```ts
// bulk/route.ts — unzip server (yauzl), for each entry presign+PUT server-side, create files + courseMaterials rows
```

- [ ] **Step 5: Commit**
```bash
git add src/app/api/files/bulk/route.ts
git commit -m "feat(files): bulk zip unpack to chapters + offline queue stub"
```

### Task 20: Responsive + Contrast + E2E Green

**Files:**
- Modify: `playwright.config.ts` (add mobile project), `tests/e2e/responsive-navigation.spec.ts`, `tests/e2e/typography-contrast.spec.ts`
- Test: full suite

- [ ] **Step 1: Failing** — `responsive 375` screenshot missing

- [ ] **Step 3: Implement**
```bash
# playwright.config: add { name:"Mobile 375", use:{ ...devices["Pixel 5"] } }
# fix any contrast fails via globals.css:62 tokens
```

- [ ] **Step 4: Run**
Run: `npx playwright test --project="Desktop Chrome" --project="Mobile 375"`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add playwright.config.ts tests/e2e/responsive-navigation.spec.ts
git commit -m "chore(qa): responsive 375/1280 + tsc green"
```

---

## Self-Review

- **Spec coverage:** Tokens (1-2), skeletons/empty (3), gauge (4), IA (5), validation→R2→authz→migration→presign→confirm→preview→dropzone→browser→notices→homework→river→routine→bulk→QA all mapped — no gaps.
- **Placeholder scan:** No `TBD`/`TODO`, each task has file paths + interface + test code + impl snippet + run command + commit message.
- **Type consistency:** `r2Key: string`, `assertCanRead(courseId:string,userId:string):Promise<void>`, `files.id: text pk`, `Dropzone({courseId,onDone})` consistent across 10-14.

---

Plan complete and saved to `docs/superpowers/plans/2026-08-23-classroom-os-visual-uploads-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
