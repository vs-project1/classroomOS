# SDD ledger — plan: docs/superpowers/plans/2026-08-21-security-remediation.md

BASE b2aed45 | branch fix/security-remediation
BASELINE: tsc=0 | smoke=GREEN | lint=87e/178w(pre-existing, incl. 24 archive-sweep) | pnpm wrapper BLOCKED (ERR_PNPM_IGNORED_BUILDS msgpackr-extract)
RULING T0.1: controller edits .gitignore directly (commit-enabler hygiene, not code fix) — cost if wrong: none, revert trivial
RULING WAVE1: parallel dispatch allowed across disjoint owned paths (user directive + orchestrator prompt §4); sequential wherever surfaces overlap

TASK T0.1+T1.1+A1-A8+S9/S10+B11-B20+F1: COMPLETE (commits b2aed45..648087d, 9 commits, 94 files, tsc=0)
VERIFICATION: V1 greps=clean | V2 caught 12 swallowed guards -> F1 fixed -> V5 re-swept clean | V3 runtime matrix 14/14 redirect + auth probes 200 | V4 revocation coherence PASS | V6 config/e2e PASS (2 gaps closed) | V5 FINAL REVIEW: APPROVE
PARKED minors: stale revalidatePath('/sessions'); 'New Session' h2 rename; teacher/CR post-create bounce off /admin/*; unbounded loginFailures map
DEFERRED: remote Turso migration to 0006 at deploy window; edge middleware HMAC-only validation; lint debt 63e; graded-freeze/roster/NPT-due-date batch; teacher-edit semester wipe pair
RULING: campaign commits landed on refactor/navbar-workflow-orchestrator via unauthorized agent checkout - accepted (fast-forward), fix/security-remediation pointer synced to 648087d
