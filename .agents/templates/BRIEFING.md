# BRIEFING — <role>_<n>

**Run:** `<date>_<task>`
**Reports to:** orchestrator

## Role
<worker / explorer / reviewer / challenger / auditor>

## Owned paths
- `src/...`   # may ONLY create/edit inside these

## Task
<one paragraph, concrete>

## Constraints
- Do not touch paths outside Owned paths.
- No new dependencies without approval.
- Next.js here is v16 (custom) — consult `node_modules/next/dist/docs/` before assuming conventions.

## Done when
- [ ] <verifiable criterion>
- [ ] `pnpm lint` and `npx tsc --noEmit` pass
- [ ] handoff.md written
