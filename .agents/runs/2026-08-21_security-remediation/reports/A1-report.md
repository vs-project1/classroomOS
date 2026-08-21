# A1 Report — Audit C1: Missing Authorization on Homework Actions

- **Date:** 2026-08-21
- **Branch:** `fix/security-remediation`
- **Owner scope:** `src/features/assignments/actions/assignments.ts` (only file edited)
- **Status:** COMPLETE

## Problem (Audit C1)

`createHomework` and `updateHomeworkStatus` in
`src/features/assignments/actions/assignments.ts` performed no authorization
check. Any authenticated user (including STUDENT) could invoke these server
actions to create homework or mutate homework status.

## Fix Applied

Added `await requireAuth(["TEACHER", "CR", "ADMIN"]);` as the **first
statement** of both functions, per remediation spec:

1. `createHomework` — now begins with the role gate before schema validation /
   DB insert.
2. `updateHomeworkStatus` — role gate placed **before** the `try` block so an
   unauthorized call throws instead of being swallowed by the existing
   error-swallowing catch.

### Import note

No import change was required: the file already imports `requireAuth` from
`@/lib/auth` (line 5) and uses it in `resolveCurrentStudentId` (line ~41).
This matches the reference pattern at
`src/features/users/actions/accounts.ts:113`
(`await requireAuth(["ADMIN"])` inside `createAccountAction`).

## Verification

| Gate | Command | Result |
|------|---------|--------|
| Type check | `npx tsc --noEmit` | exit code **0** |

No dev server started. No git commit made.

## Diff Summary (assignments.ts)

```diff
 export async function createHomework(prevState: any, formData: FormData) {
+  await requireAuth(["TEACHER", "CR", "ADMIN"]);
+
   const validatedFields = createHomeworkSchema.safeParse({
...
 export async function updateHomeworkStatus(
   id: string,
   status: "active" | "completed" | "archived"
 ) {
+  await requireAuth(["TEACHER", "CR", "ADMIN"]);
+
   try {
```

## Notes / Residual Risk

- Role set is coarse (`TEACHER`, `CR`, `ADMIN`) per spec; it does not verify
  the teacher actually teaches the subject — object-level authorization is out
  of scope for C1.
- `updateHomeworkStatus`'s catch block still swallows runtime DB errors; auth
  failures are intentionally thrown before that block.
