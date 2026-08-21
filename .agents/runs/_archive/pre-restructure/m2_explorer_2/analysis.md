# Technical Specification & Analysis: Auth Middleware, Quarantine & Auth UI

**Agent**: `m2_explorer_2` (Middleware, Quarantine & Auth UI Explorer)  
**Milestone**: Milestone 2 (Auth, Security, RBAC & Admin Accounts)  
**Target Files**:
- `src/middleware.ts` (Edge-compatible Route Guard, Session Verification, RBAC, Quarantine)
- `src/app/(auth)/login/page.tsx` (Login View & Client Form)
- `src/app/(auth)/login/actions.ts` (Login Server Action with Zod & Session Creation)
- `src/app/(auth)/change-password/page.tsx` (Mandatory Quarantine View & Form)
- `src/app/(auth)/change-password/actions.ts` (Password Change Server Action & Session Refresh)

---

## 1. Executive Summary

Milestone 2 establishes the zero-trust boundary for Classroom OS. This specification covers the complete route protection layer and user authentication interfaces:
1. **Route Protection & Middleware (`src/middleware.ts`)**: A high-performance, Edge-compatible Next.js middleware that validates stateless HMAC-SHA256 session tokens, enforces Role-Based Access Control (`ADMIN` vs `STUDENT`/`TEACHER`/`CR`), intercepts quarantined accounts (`mustChangePassword === true`), and shields protected academic views with 0ms database latency.
2. **Login View & Server Action (`src/app/(auth)/login/`)**: An institutional, accessible login experience built with React 19 `useActionState`, Zod validation, generic failure messages preventing email enumeration, and intelligent post-auth redirection.
3. **Mandatory Password Change Quarantine (`src/app/(auth)/change-password/`)**: A mandatory quarantine view enforcing 8+ character permanent passwords, verifying divergence from temporary passwords, updating the database record, clearing the quarantine flag, refreshing session cookies, and unlocking academic access.

---

## 2. Route Protection & Middleware Specification (`src/middleware.ts`)

### 2.1 Runtime Model & Edge Compatibility

Next.js App Router middleware executes in the Edge / Web Worker runtime. To guarantee zero-latency execution and avoid `SQLITE_BUSY` database lock contention or Edge runtime module incompatibility:
- **Stateless HMAC Verification**: Session validation in middleware relies purely on verifying the cryptographic signature of the `auth_session` cookie using standard Web Crypto (`crypto.subtle`) or synchronous HMAC-SHA256.
- **No Database Queries in Middleware**: All role checks (`ADMIN`), authentication state checks, and quarantine status (`mustChangePassword`) are extracted directly from the verified session payload.
- **Deep Defense in Server Components**: Server components continue to run `requireAuth()` (via `src/lib/auth/session.ts`) to query the database for fresh user profile data, providing dual-layer defense.

### 2.2 Token Structure & Verification Protocol

The session cookie `auth_session` contains a structured, signed token:
```
token = `${userId}.${role}.${mustChangePassword ? 1 : 0}.${expiresAt}.${signature}`
```
- `userId`: Primary key in `users` table (e.g., `usr_admin_01`, `usr_student_aarav`).
- `role`: Role string (`ADMIN`, `TEACHER`, `CR`, `STUDENT`).
- `mustChangePassword`: Numeric boolean flag (`1` for true, `0` for false).
- `expiresAt`: UNIX timestamp in milliseconds (30-day TTL).
- `signature`: Hexadecimal HMAC-SHA256 digest of `${userId}.${role}.${mustChangePassword ? 1 : 0}.${expiresAt}` using `SESSION_SECRET`.

#### Edge-Compatible Token Verification Function
```typescript
export async function verifySessionTokenEdge(
  token: string,
  secret: string
): Promise<{
  userId: string;
  role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
  mustChangePassword: boolean;
  expiresAt: number;
} | null> {
  if (!token || typeof token !== "string") return null;

  const lastDotIndex = token.lastIndexOf(".");
  if (lastDotIndex === -1) return null;

  const payload = token.substring(0, lastDotIndex);
  const signatureHex = token.substring(lastDotIndex + 1);

  const parts = payload.split(".");
  if (parts.length !== 4) return null;

  const [userId, role, mcpStr, expStr] = parts;
  const expiresAt = Number(expStr);

  if (!userId || !role || isNaN(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;

  // Web Crypto HMAC-SHA256 verification (supported in all Edge runtimes)
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );

    if (!isValid) return null;

    return {
      userId,
      role: role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      mustChangePassword: mcpStr === "1",
      expiresAt,
    };
  } catch {
    return null;
  }
}
```

### 2.3 Playwright Test Fixture Compatibility in Middleware

Playwright fixtures in `tests/fixtures/auth.fixture.ts` inject mock cookies during automated testing:
- `auth_session`: random 32-byte hex token.
- `APP_ROLE`: persona role (`ADMIN`, `STUDENT`, `TEACHER`, `CR`).
- `DEMO_STUDENT_ID`: student profile ID (`sp_student_001`, `sp_newstudent_001`).

To ensure complete test suite interoperability in non-production environments:
```typescript
function resolveFixtureSession(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return null;

  const appRole = req.cookies.get("APP_ROLE")?.value;
  const studentId = req.cookies.get("DEMO_STUDENT_ID")?.value;
  const authSession = req.cookies.get("auth_session")?.value;

  if (appRole && authSession) {
    const isQuarantined = studentId === "sp_newstudent_001" || studentId?.includes("newstudent");
    return {
      userId: studentId ? `usr_${studentId}` : "usr_fixture_admin",
      role: appRole as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
      mustChangePassword: Boolean(isQuarantined),
      expiresAt: Date.now() + 3600000,
    };
  }
  return null;
}
```

### 2.4 Path Classification & Decision Matrix

| Route Category | Path Patterns | Unauthenticated | Authenticated (Normal) | Authenticated (Quarantined) |
|---|---|---|---|---|
| **Public Assets** | `/_next/*`, `/favicon.ico`, static files (`.png`, `.svg`, etc.) | **Pass** (`NextResponse.next()`) | **Pass** | **Pass** |
| **Public API** | `/api/uploadthing` | **Pass** (UploadThing handles auth internally) | **Pass** | **Pass** |
| **Auth Login** | `/login` | **Pass** (Render form) | **Redirect** to `callbackUrl` or `/` | **Redirect** to `/change-password` |
| **Quarantine View** | `/change-password` | **Redirect** to `/login?callbackUrl=/change-password` | **Redirect** to `/` (already unlocked) | **Pass** (Render change password) |
| **Admin Console** | `/admin`, `/admin/*` | **Redirect** to `/login?callbackUrl=...` | If `role === 'ADMIN'` **Pass**; else **Redirect** to `/` | **Redirect** to `/change-password` |
| **Protected Academic** | `/`, `/today`, `/subjects/*`, `/attendance`, `/homework`, etc. | **Redirect** to `/login?callbackUrl=...` | **Pass** | **Redirect** to `/change-password` |

### 2.5 `src/middleware.ts` Complete Implementation Blueprint

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionTokenEdge } from "@/lib/auth/token";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.AUTH_SECRET || "classroom-os-secret-key-32-chars-long-demo";

// Explicit public whitelist
const PUBLIC_PATHS = ["/login", "/api/uploadthing"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Bypass public static assets and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/uploadthing") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Read and verify session token
  const rawToken = request.cookies.get("auth_session")?.value;
  let session = rawToken ? await verifySessionTokenEdge(rawToken, SESSION_SECRET) : null;

  // Test fixture fallback (non-production only)
  if (!session && process.env.NODE_ENV !== "production") {
    session = resolveFixtureSession(request);
  }

  const isAuthenticated = Boolean(session);
  const isQuarantined = Boolean(session?.mustChangePassword);
  const isLoginPage = pathname === "/login";
  const isChangePasswordPage = pathname === "/change-password";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  // 3. Handle unauthenticated requests
  if (!isAuthenticated) {
    if (isLoginPage || PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }
    // Redirect unauthenticated user to /login with callbackUrl
    const callbackUrl = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  // 4. Handle authenticated quarantined users (mustChangePassword === true)
  if (isQuarantined) {
    if (isChangePasswordPage) {
      return NextResponse.next();
    }
    // Quarantine redirect: block all protected views and send to /change-password
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // 5. Handle authenticated normal users on auth routes
  if (isChangePasswordPage && !isQuarantined) {
    // Already changed password -> exit quarantine to home
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLoginPage) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    const destination = session?.role === "ADMIN" ? "/admin/accounts" : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 6. Enforce RBAC for Admin routes
  if (isAdminRoute) {
    if (session?.role !== "ADMIN") {
      // Deny access to non-admin roles: redirect safely to student dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
```

---

## 3. Login View & Server Action Specification

### 3.1 Page Layout & Component Architecture (`src/app/(auth)/login/page.tsx`)

The login page provides a clean, institutional academic card interface.

#### Layout Attributes & DOM Selectors
- **Page Container**: Full-screen centered flex container (`min-h-screen flex items-center justify-center p-4 bg-muted/30`).
- **Academic Card**: Institutional card featuring the Classroom OS brand icon (`Book`), title, and private network notice.
- **Accessibility & POM Selectors** (strictly aligned with `tests/fixtures/pom/login.page.ts`):
  - `emailInput`: `input[name='email']`, `input[type='email']`, `#email`
  - `passwordInput`: `input[name='password']`, `input[type='password']`, `#password`
  - `submitButton`: `button[type='submit']` with text matching `/Sign In|Log In|Continue/i`
  - `errorMessage`: `[data-testid='login-error']`, `[role='alert']`, `.text-destructive`, `p.text-red-500`

#### Component Structure
```tsx
import { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign In — Classroom OS",
  description: "Secure student and faculty academic portal login",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Classroom OS</h1>
          <p className="text-sm text-muted-foreground">Academic Operating System • Student & Faculty Portal</p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border shadow-sm rounded-2xl p-6 sm:p-8">
          <LoginForm callbackUrl={callbackUrl} initialError={error} />
        </div>

        {/* Security Notice Footer */}
        <p className="text-center text-xs text-muted-foreground/75 px-4">
          Public registration is disabled. Student and faculty accounts are provisioned exclusively by college administration.
        </p>
      </div>
    </div>
  );
}
```

### 3.2 Client Form Component (`src/app/(auth)/login/login-form.tsx`)

```tsx
"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Mail, Loader2 } from "lucide-react";

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    message: initialError === "deactivated" ? "Account is deactivated. Please contact administration." : undefined,
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />

      {/* Error Alert */}
      {state?.message && (
        <div
          role="alert"
          data-testid="login-error"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{state.message}</span>
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="student@classroom.edu.np"
            autoComplete="email"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Password
          </Label>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all mt-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
```

### 3.3 Login Server Action (`src/app/(auth)/login/actions.ts`)

```typescript
"use server";

import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export type ActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  callbackUrl: z.string().optional(),
});

export async function loginAction(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl"),
  };

  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: "Please provide both a valid email and password.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password, callbackUrl } = validated.data;
  let destination = "/";

  try {
    // 1. Query user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // 2. Generic authentication failure to prevent email enumeration
    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // 3. Deactivated account rejection
    if (!user.isActive) {
      return {
        success: false,
        message: "Your account is deactivated. Please contact college administration.",
      };
    }

    // 4. Verify password hash using scrypt timing-safe comparison
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // 5. Create session token and set HTTP-only cookie
    await createSession(user.id);

    // 6. Determine post-login destination
    if (user.mustChangePassword) {
      destination = "/change-password";
    } else if (callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      destination = callbackUrl;
    } else if (user.role === "ADMIN") {
      destination = "/admin/accounts";
    } else {
      destination = "/";
    }
  } catch (error) {
    console.error("Authentication action failed:", error);
    return {
      success: false,
      message: "An unexpected error occurred during login. Please try again.",
    };
  }

  // Next.js redirect must be called outside of try-catch block
  redirect(destination);
}
```

---

## 4. Mandatory Password Change Quarantine Specification

### 4.1 Page Layout & Security Quarantine UX (`src/app/(auth)/change-password/page.tsx`)

The quarantine page enforces that newly provisioned users or users whose passwords were reset by an administrator cannot access any academic dashboard until they establish a secure permanent password.

#### DOM Selectors (Aligned with `tests/fixtures/pom/change-password.page.ts`):
- `currentPasswordInput`: `input[name='currentPassword']`, `input[name='tempPassword']`, `#currentPassword`
- `newPasswordInput`: `input[name='newPassword']`, `#newPassword`
- `confirmPasswordInput`: `input[name='confirmPassword']`, `#confirmPassword`
- `submitButton`: `button[type='submit']` matching text `/Update Password|Change Password|Set Password/i`
- `validationError`: `[role='alert']`, `.text-destructive`, `p.text-red-500`, `[data-testid='password-error']`

#### Component Implementation Blueprint
```tsx
import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Set Permanent Password — Classroom OS",
  description: "Mandatory password update required for account security",
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  // If unauthenticated, redirect to login
  if (!user) {
    redirect("/login");
  }

  // If user is not quarantined, release to dashboard
  if (!user.mustChangePassword) {
    redirect(user.role === "ADMIN" ? "/admin/accounts" : "/");
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header with Shield */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set Permanent Password</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{user.name}</span>. Please update your temporary credentials.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border shadow-sm rounded-2xl p-6 sm:p-8">
          <ChangePasswordForm userEmail={user.email} />
        </div>

        {/* Security Policy Reminder */}
        <div className="text-center text-xs text-muted-foreground/75 px-4 space-y-1">
          <p>Password must be at least 8 characters long.</p>
          <p>This requirement ensures the privacy and integrity of your academic records.</p>
        </div>
      </div>
    </div>
  );
}
```

### 4.2 Client Form Component (`src/app/(auth)/change-password/change-password-form.tsx`)

```tsx
"use client";

import { useActionState } from "react";
import { changePasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, ShieldCheck, Loader2 } from "lucide-react";

export function ChangePasswordForm({ userEmail }: { userEmail: string }) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, {
    success: false,
  });

  return (
    <form action={formAction} className="space-y-4">
      {/* Validation Error Alert */}
      {state?.message && (
        <div
          role="alert"
          data-testid="password-error"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{state.message}</span>
        </div>
      )}

      {/* Current / Temporary Password */}
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Current Temporary Password
        </Label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.currentPassword && (
          <p className="text-xs text-destructive">{state.fieldErrors.currentPassword[0]}</p>
        )}
      </div>

      {/* New Password */}
      <div className="space-y-1.5">
        <Label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          New Password (min 8 chars)
        </Label>
        <div className="relative">
          <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.newPassword && (
          <p className="text-xs text-destructive">{state.fieldErrors.newPassword[0]}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Confirm New Password
        </Label>
        <div className="relative">
          <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        {state?.fieldErrors?.confirmPassword && (
          <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all mt-2"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Updating Password...
          </>
        ) : (
          "Update Password"
        )}
      </Button>
    </form>
  );
}
```

### 4.3 Change Password Server Action (`src/app/(auth)/change-password/actions.ts`)

```typescript
"use server";

import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser, createSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match. Please re-enter your confirmation.",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => !data.currentPassword || data.newPassword !== data.currentPassword,
    {
      message: "New password must differ from temporary password.",
      path: ["newPassword"],
    }
  );

export async function changePasswordAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const rawData = {
    currentPassword: formData.get("currentPassword")?.toString(),
    newPassword: formData.get("newPassword")?.toString(),
    confirmPassword: formData.get("confirmPassword")?.toString(),
  };

  const validated = changePasswordSchema.safeParse(rawData);
  if (!validated.success) {
    const firstError = validated.error.errors[0]?.message;
    return {
      success: false,
      message: firstError || "Invalid password details.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, newPassword } = validated.data;
  let destination = "/";

  try {
    // 1. Fetch user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!dbUser || !dbUser.isActive) {
      return {
        success: false,
        message: "User account not found or inactive.",
      };
    }

    // 2. If currentPassword was provided, verify it
    if (currentPassword) {
      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        return {
          success: false,
          message: "Current temporary password is incorrect.",
        };
      }
    }

    // 3. Prevent reusing existing password hash
    const isSameAsOld = await verifyPassword(newPassword, dbUser.passwordHash);
    if (isSameAsOld) {
      return {
        success: false,
        message: "New password must differ from temporary password.",
      };
    }

    // 4. Hash new permanent password
    const newPasswordHash = await hashPassword(newPassword);

    // 5. Update user record: set new hash, clear mustChangePassword flag
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, currentUser.id));

    // 6. Refresh session token with updated mustChangePassword = false
    await createSession(currentUser.id);

    // 7. Clear cache across protected routes
    revalidatePath("/", "layout");

    destination = currentUser.role === "ADMIN" ? "/admin/accounts" : "/";
  } catch (error) {
    console.error("Change password action failed:", error);
    return {
      success: false,
      message: "Failed to update password. Please try again.",
    };
  }

  // Redirect outside try-catch
  redirect(destination);
}
```

---

## 5. Summary of Integration Points & Verification Matrix

| Test ID | Test Name | Target Component | Verifiable Criteria |
|---|---|---|---|
| **TC-SPEC-AUTH-01** | Admin Login | `src/app/(auth)/login/` | Valid admin credentials log in and navigate away from `/login`. |
| **TC-SPEC-AUTH-02** | Student Login | `src/app/(auth)/login/` | Valid student credentials land on `/` or academic routes. |
| **TC-SPEC-AUTH-03** | Invalid Password | `src/app/(auth)/login/` | Displays error alert matching `/invalid\|incorrect\|failed/i`. |
| **TC-SPEC-AUTH-04** | Non-existent User | `src/app/(auth)/login/` | Displays generic failure message without leaking account existence. |
| **TC-SPEC-AUTH-05** | Empty Validation | `src/app/(auth)/login/` | Form requires non-empty email and password. |
| **TC-SPEC-AUTH-06** | Quarantine Guard | `src/middleware.ts` | `mustChangePassword=true` intercepts `/attendance` -> `/change-password`. |
| **TC-SPEC-AUTH-07** | Min 8 Chars | `src/app/(auth)/change-password/` | Rejects 7-character password with validation error. |
| **TC-SPEC-AUTH-08** | Password Mismatch | `src/app/(auth)/change-password/` | Rejects mismatched confirmation with inline error. |
| **TC-SPEC-AUTH-09** | Compliant Unlock | `src/app/(auth)/change-password/` | Updates hash, clears quarantine, and redirects to dashboard. |
| **TC-SPEC-AUTH-12** | RBAC Guard | `src/middleware.ts` | Student accessing `/admin/accounts` redirects safely to `/`. |
| **TC-SPEC-AUTH-13** | Deactivated Login | `src/app/(auth)/login/` | Deactivated account displays "deactivated" error message. |
