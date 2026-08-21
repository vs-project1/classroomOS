# SDD ledger — plan: docs/superpowers/plans/2026-08-21-security-remediation.md

BASE b2aed45 | branch fix/security-remediation
BASELINE: tsc=0 | smoke=GREEN | lint=87e/178w(pre-existing, incl. 24 archive-sweep) | pnpm wrapper BLOCKED (ERR_PNPM_IGNORED_BUILDS msgpackr-extract)
RULING T0.1: controller edits .gitignore directly (commit-enabler hygiene, not code fix) — cost if wrong: none, revert trivial
RULING WAVE1: parallel dispatch allowed across disjoint owned paths (user directive + orchestrator prompt §4); sequential wherever surfaces overlap
