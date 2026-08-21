# Domain Brief: Testing

## Purpose
Playwright e2e suite (7 specs, ~65 cases) + verification scripts. The gate actually used during the
2026-08-21 remediation is `npx tsc --noEmit` exit 0; lint carries known debt.

## Key files
- `playwright.config.ts` — workers:1 / fullyParallel:false (:20-21), baseURL port 3001 (:38,:67-68),
  timezone Asia/Kathmandu (:41), webServer `npm run dev -- -p 3001` (:66-76)
- `tests/e2e/` — auth-lifecycle, dashboard-schedule, attendance-barometer, homework-submissions,
  subject-isolation, responsive-navigation, typography-contrast specs
- `tests/fixtures/auth.fixture.ts` — cookie-injection personas (:17-65)
- `tests/fixtures/global-setup.ts` — migrate+seed target DB (:8-45)
- `scripts/verify-db.ts` (`pnpm db:verify`), `scripts/test-attendance-stress.ts`, `scripts/challenger-m2-*.ts`
- `package.json` — test:e2e (:16), db:* scripts (:10-14)

## Invariants
1. Serial execution only (workers:1) — SQLite single-writer safety (playwright.config.ts:19-21).
2. Port is 3001 in config; TEST_READY.md:32 claiming 3000 is DRIFT (3000 appears only as a stale doc claim).
3. Auth fixtures inject an `auth_session` cookie minted via createSessionToken (auth.fixture.ts:22-27) plus
   legacy APP_ROLE/DEMO_STUDENT_ID cookies (:30-61). This only works because all consumers are gated by
   NODE_ENV !== "production" (see authentication.md invariant 2).

## Known sharp edges
- **S10 BROKE the auth fixture**: injected tokens have NO matching `sessions` row, so getCurrentUser
  hard-denies (session.ts:243-249) → fixture-based tests fail until the fixture inserts a row or logs in
  via UI (S10 deferred #4; auth.fixture.ts:22-27). Fix BEFORE trusting any green e2e run. PLANNED.
- TEST_INFRA.md:65 and TEST_READY.md:19 claim logout coverage in auth-lifecycle.spec.ts — grep finds no
  logout test; doc drift per role-contract priority #2 (fix doc OR add spec — UNRESOLVED).
- Tautological/vacuous tests in scripts/challenger-m2-stress.ts:236 (asserts x===x) etc. — review
  IMPORTANT, UNFIXED.
- e2e global-setup migrates+seeds whatever DATABASE_URL says (global-setup.ts:11-33) — same live-DB hazard
  as database.md edge #1.
- Lint baseline 63 errors / 167 warnings is pre-existing (T0.1 evidence): `pnpm lint` exit 1 is EXPECTED;
  don't treat as regression, but don't ignore new findings either.
- playwright webServer sets APP_ROLE:"ADMIN" env (playwright.config.ts:74) — inert post-T1.1 (env
  fail-open removed from index.ts) but misleading; cleanup candidate.

## Changelog
- 2026-08-21: T0.1 unblocked pnpm install/lint gates; S10 flagged fixture breakage. Sources: reports
  T0.1/S10; docs/reviews/2026-08-21-full-codebase-review.md; TEST_INFRA/TEST_READY drift audit.
