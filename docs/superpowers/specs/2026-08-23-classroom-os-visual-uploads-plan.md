# Classroom OS — Visual Elevation + Uploads & Notes Completion — Design Spec

**Date:** 2026-08-23
**Classification:** Architectural (new subsystem + visual system + data wiring)
**Source:** 47 real screenshots at `http://localhost:3000` (1280x720, `.gstack/screenshots/real/`), LLM Council (5 members + 3 peer reviews), ui-ux-pro-max Data-Dense Dashboard, web refs (Eduva, Shadcn Academy, Mobbin/SaaSUI)
**Stack:** Next.js 16 App Router / React 19 / Tailwind v4 / Drizzle libSQL / uploadthing (legacy) → R2 presigned

---

## 0. Executive Summary

Classroom OS is **70% LMS shell, 30% working product**. Schema is rich (`courseUnits/Chapters/Materials`, `resources`, `assignmentSubmissions`, `notices`, `notifications`) but UI leaves the last mile unwired: homework submit is dead, `/teacher/resources` renders empty, notices are text-only, course materials browser doesn't exist. Visually it's competent 2023 — indigo sidebar `#1E1B4B` on `#F0F4FF`, flat `bg-white border-slate-200` cards, Inter everywhere — but flat, heavy, and inconsistent across roles. Council consensus (A+C win) = fix **uploads as a versioned file graph** first, then **materials browser**, then **visual elevation** in one pass. Wedge = **Operations OS for TU** (routine-change intelligence), not a Moodle clone.

**Gallery:** `D:\CLASSROOM OS\.gstack\screenshots\real\index.html` — ADMIN 12, STUDENT 17, TEACHER 6, CR 5, GUEST 7

---

## 1. Council Verdict Synthesis (Chairman)

### 1.1 Final Chairman Answer

Merge A+C strengths, resolve via peer ranking:

**Visuals:** A was most accurate on screenshot-observable flaws; D offered craft but hallucinated `rounded-[20px]` vs actual `radius 0.75rem`. Truth = sidebar too heavy + cards flat + empty states = 404 + typography micro + spacing rhythm drift. Fix with light academic inversion (bg `#F8FAFF`, card `#FFFFFF` border `#E2E8F0`, primary `#4F46E5`) + elevation stack, not a rebrand.

**Flows:** B correctly identified broken flows observable at 1280px: submit has no optimistic UI/toast, teacher upload stubbed (`fileUrl` string not R2), CR log no clash validation, admin no bulk, notices no attachments. These are screenshot-provable; E's JTBD scores (5/4/3/3) are invented.

**Engineering:** C is most verifiable: `resources.chapterId` nullable orphan risk, `assignmentSubmissions.fileUrl` as dead string (no versioning/file table), `uploadthing` 16MB pdf/image limit for R2-sized LMS, `sessions` revocation not enforced, `notes`/`courseMaterials` dead relations. Proposed R2 presigned POST is correct; uploadthing stays only for avatar.

**IA:** B+E's role-aware grouped sidebar + collapsible Course switcher + breadcrumb beats current generic sidebar (~160px wasted at 1280px). Combine with A's 4pt rhythm.

**Killer Features — choose one each layer:**
- Product wedge: **Routine Intelligence Engine (E)** — routine change auto-invalidates `classSessions`/`attendance`, notifies batches, suggests substitute. No competitor does this for TU.
- UX graph: **Routine-to-Resource Graph (A)** + **Versioned File Graph (C)** are same insight at different layers — merge them. Single implementation (file graph with `parentFileId/version/checksum` + `weeklyRoutine` wiring) delivers both.
- Visual delight: **Living Timetable River (D)** — keep as visual wrapper around routine graph, not standalone.

### 1.2 Peer Rank Table

| Response | Author Focus | Avg Peer Rank | Verdict |
|----------|--------------|---------------|---------|
| A | Visual+Product (Data-Dense fix + Graph) | 1.67 | **Most complete** — screenshot-grounded, concrete tokens, ties product+visual |
| C | Engineering (R2 presigned + File Graph) | 2.00 | **Deepest leverage** — verifiable schema debt, best technical killer |
| B | UX (flows + skeletons + IA) | 2.33 | **Strong on flows** — accurate broken-flow diagnosis, generic on tokens |
| E | Product (JTBD + wedge) | 4.00 | **Best wedge** (Operations OS) but scores/estimates speculative |
| D | Visual Craft (Warm Academic / gallerie) | 4.67 | **Most craft** (card 20px, arc gauge) but hallucinates palette, weakest accuracy |

*Ranking: 1=best, avg of 3 reviewers. Reviewer1: A>B>C>E>D, Reviewer2: A>C>B>D>E, Reviewer3: C>A>B>E>D*

### 1.3 Notable Disagreements

1. **Sidebar color:** A/D say `#1E1B4B` too heavy; peer reviewers note actual is Ice-Indigo `#F0F4FF` bg + `Deep Midnight #0B0F19` dark — so inversion should be `softening` not `lightening`. Resolution: keep indigo but move from full fill to left-border active indicator + `bg-white` sidebar in light, `bg-slate-900` in dark.
2. **Uploadthing vs R2:** C says ditch uploadthing for LMS; A says keep as unified service. Resolution: keep uploadthing for avatars (`/api/uploadthing/core.ts:11-15` 16MB limit), R2 presigned for LMS files (100MB video / 25MB doc).
3. **Palette direction:** D proposes 3 moods (Warm Academic parchment, Premium Dark, Playful neubrutalism); A proposes single inversion `#F8FAFF/#4F46E5`. Resolution: ship A as default + D Warm Academic as theme toggle (user-selectable, persisted).
4. **Killer feature overlap:** A/C/E all propose graph variants — they are same file+routine wiring at different layers. Merge, don't pick one.

---

## 2. Approaches Considered (3, with trade-offs)

### Approach 1 — Incremental Polish (Bounded)
Ship only visual tokens + empty states + fix existing uploadthing handlers. 1 week, no DB migration. Pros: fast, shippable. Cons: leaves `chapterId` orphan debt, `fileUrl` string debt, no preview/versioning, hits 5k-row OOM. Rejected — doesn't close PMF gap.

### Approach 2 — Full Rebuild on Supabase Storage (Heavy)
Migrate to Supabase Postgres + Supabase Storage, rewrite auth to Supabase Auth, drop libSQL. Pros: managed DX. Cons: 4-week migration, re-seed 16 users/8 profiles, break local.db dev flow, doesn't solve routine intelligence. Rejected — too much churn for upload fix.

### Approach 3 — Versioned File Graph + Visual Elevation (Recommended)
Keep libSQL/Drizzle, add `files` table + R2 presigned POST + confirm + signed GET preview, wire `resources`/`courseMaterials`/`assignmentSubmissions`/`notices.attachments` through it, add design tokens + skeletons + timeline, ship grouped IA + routine graph. Pros: closes schema→UI wiring with one abstraction, keeps local.db, enables offline queue later. Cons: requires migration + R2 bucket + worker for thumbnails. **Selected** — best impact/effort for LMS completeness.

---

## 3. Design — Sections (get approval per section)

### 3.1 Visual System (Tokens) — fixes A+D findings

**Palette — Light Academic Inversion (default):**
- `bg: #F8FAFF` (warmer than #F0F4FF, fixes D wash-out)
- `card: #FFFFFF` + `border: #E2E8F0` (slate-200, visible in light, not `white/10`)
- `sidebar: #FFFFFF` light / `#0F172A` dark, active = 3px `#4F46E5` left border + `bg-indigo-50` tint, not full `#1E1B4B` fill
- `primary: #4F46E5` (indigo-600), `cta: #16A34A` (emerald-600, not #22C55E neon), `amber: #D97706`, `rose: #E11D48`
- `text: #0F172A slate-900 / #475569 slate-600 / #64748B` — min 4.5:1, no `slate-400` body
- `radius: 0.75rem` (keep, not 20px), `shadow: 0 1px 3px rgba(15,23,42,0.06)` + hover `0 8px 24px rgba(15,23,42,0.08)`

**Typography — Inter 600 for data, curated display:**
- `H1: Inter 600 28px -0.02em`, `H2: Inter 600 20px`, `label: Inter 500 12px 0.06em tracking`, `body: Inter 400 14px/1.65`, `numeric: tabular-nums`
- `JetBrains Mono / Fira Code` ONLY for `fileType: code` badges
- Fix: "Good morning Rohan" leading 12px, "CLASS REPRESENTATIVE" tracking 0.08em (not 0.02), 78% weight 700 with `text-slate-900` not amber alone

**Effects — subtle, not glassy:**
- Card hover `translate-y-[-1px] border-indigo-200 transition-colors duration-200`
- Shimmer skeleton `from-slate-100 to-slate-50` (not pulse)
- Arc gauge for 78%: segmented `red→amber→green`, needle, `48px` number
- No emoji icons — Lucide 24x24 w-5 h-5, `cursor-pointer` all cards, focus ring `ring-indigo-500`

**Theme Toggle — Warm Academic alt (D):** Ink `#1A1C2E` / Parchment `#FDF8F0` / Terracotta `#D96941` / Sage `#6B8E6B` — persisted via `localStorage` + `prefers-color-scheme`.

### 3.2 Information Architecture (fixes B+E)

**Role-aware grouped sidebar (collapsible):**
- STUDENT: `Academics` (My Subjects, Timetable/Routine, Class History, What You Missed) / `Work` (Assignments: To Do 1 / Graded) / `Class` (Attendance, Resources← wired) / `Campus` (Notices, Events, Notifications)
- TEACHER: `Teaching` (My Subjects 2 assigned, Attendance, Grading) / `Work` (Lecture Logs, Resources) / `Today`
- CR: `Class Mgmt` (Log Session, Attendance, Class History) / `My Class` (Subjects, Routine, Notifications) — badge `CLASS REPRESENTATIVE`
- ADMIN: `People` (Students, Teachers, Accounts) / `Academics` (Subjects, Assignments) / `Campus` (Notices, Events) / `System` (Attendance Reviews)

**Global:** Collapsible Course switcher (select subject → filters routine/resources/assignments), breadcrumbs `Courses > CSE201 > Assignments`, `cmd+K` palette, bottom tab bar <768px `Home/Courses/Tasks/Notices`.

### 3.3 Uploads & Notes — The Wiring (fixes C+A)

**Files table (new):**
```
files {
 id pk, ownerId fk users, r2Key unique, mime, size, checksum sha256,
 courseId? fk subjects, chapterId? fk courseChapters,
 submissionId? fk assignmentSubmissions, noticeId? fk notices,
 version int default 1, parentFileId self fk, createdAt
}
```
Add `files` dedup by checksum, version chain.

**Flow — R2 Presigned POST:**
1. `POST /api/files/presign {courseId, chapterId, mime, size, checksum}` — server validates RBAC (`assertCanRead(courseId, userId)` + `fileType allowlist: pdf/docx/pptx/mp4/zip/code/link` + `size 25MB doc / 100MB video`), returns `{url, r2Key: course/{cid}/chapter/{chp}/{uuid}.{ext}, headers}`.
2. Client `PUT` directly to R2 (private bucket).
3. `POST /api/files/confirm {r2Key, checksum}` — server magic-bytes sniff, thumbnail worker (pdf→webp), insert `files` + link to `resources.fileUrl` or `assignmentSubmissions.fileUrl` or `courseMaterials.fileUrl` or `notices.attachments`.

**Preview:** `GET /api/files/[id]/preview` → 60s signed GET, inline `Content-Disposition: inline`, PDF.js for pdf, `next/image` for webp, `<video>` for mp4. No client `fileUrl` trust.

**Notices 2.0:** `notices` add `attachments: json<string[]>`, rich-text (TipTap), `isPinned/expiresAt`, fan-out to `notifications` (type `notice`), "Seen by" receipts.

**Course Materials Browser:** `Subject → Units → Chapters accordion → Resources list + file icons + preview` — replaces empty `/teacher/resources` (currently 137KB screenshot with empty card). Add bulk zip unpack (server unzips to chapters).

**Homework Loop:** Student `homework/[id]` → drag-drop → optimistic submit → teacher `grading` → inline annotation + score → `gradedBy/gradedAt` → student `notifications`.

**Offline:** IndexedDB queue + background sync → presign retry (for hostel WiFi).

### 3.4 Routine-to-Resource Graph (Killers A+C+E merged)

**Routine Intelligence Engine:**
- Admin edits `weeklyRoutine` once → auto-regenerates `classSessions` for affected `subjectId/dayOfWeek`, invalidates `attendance` slots, notifies batches via `notifications` + optional WhatsApp hook, suggests substitute `teachers` for clash, regenerates attendance sheet.
- Student `Today` + `Routine` → vertical **Timeline River** (D's Living Timetable): 7AM-12PM axis, pills at `startTime` height, current glows/pulses, completed desaturates, next shows progress thread. Tap pill → drawer: linked chapter `courseMaterials`, due `homework`, one-click `attendanceCorrectionRequests`, generates `studyTasks` checklist with previews.
- CR verified `lectureLogs` (`topicsCovered/homework/notes`) auto-attach to session, feed Activity Feed (B's linear timeline).

### 3.5 Security & Performance

- RBAC helper `assertCanRead/Write(courseId, userId)` on every `files/confirm`, `submissions/[id]`, `resources`. `/admin/*` already checks `role===ADMIN` in `src/proxy.ts:108` but add per-resource IDOR checks.
- `sessions` index `(userId, expiresAt)`, cron purge.
- Pagination on all `findMany` (limit 50), index `(chapterId, createdAt)` on `resources`.
- FileType enum at DB check, not just client.

---

## 4. Implementation Plan (phased, references)

**Phase 1 — Foundation (S/M):**
- Design tokens `src/app/globals.css:62-136`, `tailwind.config`, `components/ui/card/button/skeleton` — 4pt rhythm, shadows, radii, focus rings.
- Skeletons for admin 12 + student 17 cards, hover `cursor-pointer transition-colors`.
- Empty states: illustration + CTA (Lucide `BookOpen`, `FileQuestion`).

**Phase 2 — File Graph (M/L):**
- Migration: `files` table, `notices.attachments`, fix `resources.chapterId` cascade + index.
- `POST /api/files/presign`, `POST /api/files/confirm`, `GET /api/files/[id]/preview` (R2).
- Wire `resources`, `courseMaterials`, `assignmentSubmissions`, `notices`.

**Phase 3 — Materials Browser + Notices 2.0 + Homework Loop (M):**
- `src/app/(student)/subjects/[slug]` browser, teacher `resources` + `grading`, rich-text notices.

**Phase 4 — Routine Intelligence + Timeline River + IA (M):**
- Routine edit → session re-gen, grouped sidebar, `cmd+K`, bottom tabs, arc gauge, timeline river, Activity Feed.

**Phase 5 — Polish + Tests (S):**
- `npx tsc --noEmit`, `responsive` 375/768/1024/1440 screenshots via browse, `typography-contrast` e2e, bulk zip, offline queue.

**References to study (screenshots + web):**
- Eduva (CreativeMarket) card-based education IA — https://a.creativemarket.com/peterdraw/292295788-Learning-Management-System-Dashboard
- Shadcn UI Kit Academy & SkillSphere Figma kit — https://adminlte.io/blog/lms-dashboard-templates/
- SaaSUI / Mobbin / SaaSFrame real dashboard patterns — https://www.saasui.design/best-saas-dashboard-ui-inspiration

---

## 5. Open Questions (need approval)

1. R2 bucket provider: Cloudflare R2 (recommended, private, presigned) vs Supabase Storage vs keep uploadthing?
2. Theme toggle: ship Warm Academic alt or single inversion?
3. Assignment versioning: allow resubmit before due or single submit + version chain?
4. WhatsApp hook for Routine Intelligence: out of scope v1 or include `notifications` push only?

---

**Next step per brainstorming skill:** Invoke `writing-plans` to break Phase 1-2 into tracked tickets (blocked edges), then implement bounded slice (tokens + skeletons) behind approval gate. This spec is committed; awaiting human yes before plan write.

