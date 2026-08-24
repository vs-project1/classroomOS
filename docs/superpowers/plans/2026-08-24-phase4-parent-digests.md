# Phase 4: Parent/Guardian Weekly Email Digests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** Weekly guardian email digest (attendance %, pending/overdue homework, upcoming exams, notices) + end-of-day absence alerts. NO parent login. Unsubscribe via tokenized link. Completely free: Gmail SMTP app-password (500/day, no card, no domain needed).

**Architecture:** `guardians` child table (per-recipient token/prefs) — NOT columns on studentProfiles. `email_logs` doubles as idempotency guard AND work queue (unique guardianId+kind+refDate; claim by insert-on-conflict). GitHub Actions cron drains bounded batches through authenticated route. Transport behind driver interface (smtp default, resend optional later).

**Spec:** Council consensus (big-pickle + mimo). Decisions: Gmail SMTP over Resend (Resend sandbox can't reach arbitrary parents without a verified domain); absence alerts batched end-of-day not per-period; GET /unsubscribe shows confirm form (never mutate on GET — SafeLinks prefetch); List-Unsubscribe headers; plain-text alternative part mandatory.

## Global Constraints
- Env: SMTP_HOST/PORT/USER/PASS/FROM, CRON_SECRET, APP_URL, SCHOOL_TZ (Asia/Kathmandu).
- All week/date math via date-parts in SCHOOL_TZ ('YYYY-MM-DD' strings) — never toISOString() on local Dates.
- Batch sends ≤30/run, ≥200ms between sends; runs × batch ≤ Gmail cap. Kill-switch env DIGEST_ENABLED.
- WAL mode pragma for SQLite so cron writes don't lock interactive traffic.

### Task 1: Schema + tokens
**Files:** Modify `src/db/schema.ts`; migration 0012
```ts
guardians(id, studentId FK cascade, name, relation, email, weeklyDigestEnabled bool dflt true,
          absenceAlertEnabled bool dflt true, unsubscribeToken unique, unsubscribedAt null,
          UNIQUE(studentId,email))
emailLogs(id, guardianId FK cascade, kind 'WEEKLY_DIGEST'|'ABSENCE_ALERT', refDate 'YYYY-MM-DD',
          status sending|sent|failed|suppressed, attempts int dflt 0, error, sentAt,
          UNIQUE(guardianId,kind,refDate), idx(kind,refDate,status))
```
- [ ] Migrate; commit `feat(digest): guardians + email logs schema`

### Task 2: Mail transport + templates
**Files:** `src/features/notifications/mail.ts` (nodemailer lazy-import; smtp.gmail.com:465 secure; From == authed address exactly; dev-mode console fallback when no creds)
Templates: `templates/layout.ts` (600px tables, inline styles only, escapeHtml everywhere), `digest.ts`, `absence.ts` + plain-text twins; footer unsubscribe URL + school name; headers `List-Unsubscribe` + `List-Unsubscribe-Post`
- [ ] Commit `feat(digest): mailer drivers + email templates`

### Task 3: Digest data + send pipeline
**Files:** `queries/digest-data.ts` (raw sql`` aggregates: weekly+overall attendance pct — attended:=present+late, excused excluded from denominator, matching Phase 3 rules; pending vs overdue homework excluding submitted/graded; exams next 14d via enrollments join; recent notices limit 5), `send-digest.ts`, `send-absence-alerts.ts`
- Claim pattern: INSERT log row status='sending' `.onConflictDoNothing()` → changes===0 means taken → skip. After send update sent/failed; retry while attempts<3 then suppressed.
- [ ] Unit-test claim/idempotency logic; commit `feat(digest): idempotent send pipeline`

### Task 4: Cron route + workflow
**Files:** `src/app/api/cron/mail/route.ts` (POST; timingSafeEqual bearer check; body {kind,limit,date}; returns {claimed,sent,failed,remaining}); `.github/workflows/cron-mail.yml` (Mon hourly drain matrix + weekday evening absence alerts + workflow_dispatch; off-:00 minutes; secrets APP_URL, CRON_SECRET)
- [ ] Commit `ci(digest): github actions cron`

### Task 5: Admin UI + unsubscribe
**Files:** `features/students/components/guardian-editor.tsx` wired into admin student page (+coverage badge "N students missing guardian email"); `/unsubscribe/page.tsx` public (token validate → scope choices → confirm form → action sets flags); admin notifications page w/ manual "send now" button + log viewer
- [ ] E2E: self-send flow, unsubscribe flow, retry path
- [ ] Commit `feat(digest): guardian editor + unsubscribe flow`
