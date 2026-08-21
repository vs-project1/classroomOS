# B15 Report — resources.ts security remediation

- **Date:** 2026-08-21
- **Branch:** fix/security-remediation
- **File (only file touched):** `src/features/resources/actions/resources.ts`
- **Status:** ✅ COMPLETE

## Problems (from audit)

1. **IMPORTANT:** `requireAuth` ran INSIDE the try/catch, so its `NEXT_REDIRECT` throw was swallowed and converted into an inline error message — unauthenticated users saw an error state instead of being redirected to login.
2. **IMPORTANT:** Raw `error.message` was returned to clients (`error.message || "An error occurred..."`), leaking internal details.

## Fixes applied

1. Moved `const user = await requireAuth(["TEACHER", "ADMIN"]);` ABOVE the `try` block so redirect digests propagate to Next.js and the client is redirected normally.
2. Added a redirect-digest guard at the top of the catch block: `if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;` (defense-in-depth for any future redirects inside the try).
3. Replaced user-facing message with fixed string `"Unable to save resource"`; removed `error.message` from the return value entirely.
4. Server-side detail logging retained via `console.error("Failed to create resource:", error)`.

## Before / After

**Before (lines 18–23, 64–67):**

```ts
export async function createResourceAction(prevState: any, formData: FormData) {
  try {
    const user = await requireAuth(["TEACHER", "ADMIN"]);
    if (!user.teacherId) {
      return { success: false, message: "Only teachers can upload resources." };
    }
    ...
  } catch (error: any) {
    console.error("Failed to create resource:", error);
    return { success: false, message: error.message || "An error occurred while uploading resource." };
  }
}
```

**After (lines 18–24, 65–71):**

```ts
export async function createResourceAction(prevState: any, formData: FormData) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  try {
    if (!user.teacherId) {
      return { success: false, message: "Only teachers can upload resources." };
    }
    ...
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to create resource:", error);
    return { success: false, message: "Unable to save resource" };
  }
}
```

## Evidence

- **Gate:** `npx tsc --noEmit` → exit code **0** (verified via `$LASTEXITCODE` in PowerShell).
- **Scope check:** only `src/features/resources/actions/resources.ts` modified; no git commit performed.
- **Docs check:** consulted bundled `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md` — confirms `redirect()` throws a `NEXT_REDIRECT` error; digest-based rethrow is the correct pattern per AGENTS.md guidance.
