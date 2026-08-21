# Architectural Specification: Session Auth & Cryptography Service

## 1. Executive Summary

This document provides the comprehensive architectural specification for the Session Authentication and Cryptography subsystem of Classroom OS (`src/lib/auth/`). The service implements a zero-dependency, private, session-based authentication model using Node.js native cryptography (`node:crypto` `scrypt` and `HmacSHA256`) and Next.js 16 App Router asynchronous cookie management.

The architecture strictly adheres to:
1. **Radical Simplicity (YAGNI)**: Zero external auth dependencies (no NextAuth/Auth.js bloat, no JWT packages); pure `node:crypto` native primitives.
2. **Strict Database-Level Integrity**: Authentication identities (`users`) linked 1:1 to academic profiles (`student_profiles`, `teachers`).
3. **Deterministic Compatibility**: 100% mathematical and byte-level compatibility with existing password hashes seeded in `src/db/seed.ts`.
4. **Next.js 16 App Router Standards**: Full asynchronous `await cookies()` API support and compatibility with both production workflows and Playwright E2E instant test fixtures.

---

## 2. Password Cryptography (`src/lib/auth/password.ts`)

### 2.1 Analysis of Seeded Format in `src/db/seed.ts`

In `src/db/seed.ts` (lines 34–38), password hashing is defined as:
```typescript
export function hashPassword(plainText: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}
```

#### Byte & Format Specification
- **Salt Generation**: 16 bytes generated via `crypto.randomBytes(16)` encoded as a 32-character hexadecimal string.
- **Salt Parameter in Scrypt**: The 32-character hexadecimal string `salt` is passed directly as the salt input to `scrypt`.
- **Derived Key Length (`keylen`)**: Exactly 64 bytes (512 bits).
- **Derived Key Encoding**: 64 bytes encoded as a 128-character hexadecimal string.
- **Delimiter**: A single colon (`:`) separating salt and derived key.
- **Total Hash String Length**: Exactly `32 + 1 + 128 = 161` characters.
- **Scrypt Parameters**: Default Node.js cost parameters ($N=16384, r=8, p=1, \text{maxmem}=32\text{MB}$).

### 2.2 Async Non-Blocking Hashing & Verification Implementation

To prevent blocking the Node.js event loop during Server Actions and API requests, production hashing and verification must use asynchronous `crypto.scrypt` via `node:util` `promisify`.

#### Implementation Design for `src/lib/auth/password.ts`:

```typescript
import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

const SALT_BYTES = 16;
const KEY_LEN = 64;

/**
 * Hashes a plain text password using scrypt with a random 16-byte salt.
 * Output format: `${saltHex}:${derivedKeyHex}` (161 characters)
 * 100% compatible with src/db/seed.ts.
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scryptAsync(plainText, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Synchronous variant for seeding scripts and CLI utilities.
 */
export function hashPasswordSync(plainText: string): string {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, KEY_LEN);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plain text password against a stored scrypt hash using timingSafeEqual.
 * Returns false safely on any malformed input without throwing unhandled exceptions.
 */
export async function verifyPassword(plainText: string, storedHash: string): Promise<boolean> {
  if (!plainText || !storedHash || typeof plainText !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [salt, expectedKeyHex] = parts;
  if (salt.length !== 32 || expectedKeyHex.length !== 128) {
    return false;
  }

  try {
    const derivedKey = (await scryptAsync(plainText, salt, KEY_LEN)) as Buffer;
    const expectedKey = Buffer.from(expectedKeyHex, "hex");

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Generates an 8+ character memorable temporary password for Admin Provisioning (F5).
 * Format: Temp# + 8 alphanumeric random characters (e.g. Temp#X7k9M2qP)
 */
export function generateTemporaryPassword(): string {
  const randomChars = crypto.randomBytes(6).toString("base64url").slice(0, 8);
  return `Temp#${randomChars}!`;
}
```

---

## 3. Session Token & Cookie Management (`src/lib/auth/session.ts`)

### 3.1 Token Format: Cryptographic HMAC Signing

Rather than adding a separate `sessions` table (maintaining radical simplicity and avoiding unnecessary database write overhead on every read), we use a cryptographically signed, stateless session token stored in the `auth_session` HTTP-only cookie.

#### Token Structure
```
token = `${userId}.${expiresAt}.${hmacSignature}`
```
- `userId`: The primary key in the `users` table (e.g. `usr_admin_01`, `usr_student_aarav`).
- `expiresAt`: UNIX epoch timestamp in milliseconds (e.g. `Date.now() + 30 * 86400 * 1000`).
- `hmacSignature`: Hexadecimal HMAC-SHA256 digest of `${userId}.${expiresAt}` generated using `SESSION_SECRET`.

#### Security Properties
1. **Tamper Proof**: Changing `userId` or `expiresAt` invalidates `hmacSignature`.
2. **Constant-Time Verification**: Signature verification uses `crypto.timingSafeEqual`.
3. **Expiration Enforcement**: Tokens older than `expiresAt` are immediately rejected.
4. **Secret Key**: Derived from `process.env.SESSION_SECRET` or `process.env.AUTH_SECRET` (with secure fallback for local development).

### 3.2 Cookie Configuration Standards

| Attribute | Setting | Rationale |
|---|---|---|
| **Name** | `auth_session` | Primary authentication cookie across student and admin portals. |
| **HttpOnly** | `true` | Prevents access via client-side JavaScript (`document.cookie`), mitigating XSS token theft. |
| **Secure** | `process.env.NODE_ENV === "production"` | Enforces HTTPS in production while allowing `http://localhost:3000` in development and E2E testing. |
| **SameSite** | `"lax"` | Mitigates Cross-Site Request Forgery (CSRF) while allowing normal top-level navigation. |
| **Path** | `"/"` | Available across all sub-paths (`/`, `/admin/*`, `/today`, `/subjects/*`, `/api/*`). |
| **Max-Age** | `30 * 24 * 60 * 60` (2,592,000s) | 30-day session TTL per Requirement §R1 / F4. |

### 3.3 Next.js 16 App Router Asynchronous API Integration

Next.js 16 enforces that `cookies()` is asynchronous and must always be awaited:
```typescript
import { cookies } from "next/headers";

const cookieStore = await cookies();
const token = cookieStore.get("auth_session")?.value;
```

When setting or clearing cookies in Server Actions:
```typescript
const cookieStore = await cookies();
cookieStore.set("auth_session", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
});
```

---

## 4. Detailed Specification of Auth Functions

### 4.1 Interface Contract: `SessionUser`

Defined in `PROJECT.md` §Interface Contracts:
```typescript
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
  mustChangePassword: boolean;
  isActive: boolean;
  studentProfileId?: string;
  teacherId?: string;
}
```

### 4.2 `createSession(userId: string): Promise<string>`

1. Validate that `userId` exists and `isActive === true` in the `users` table.
2. Calculate `expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000`.
3. Compute `signature = createHmac("sha256", SECRET).update(`${userId}.${expiresAt}`).digest("hex")`.
4. Assemble token: `const token = `${userId}.${expiresAt}.${signature}`;`
5. Call `(await cookies()).set("auth_session", token, cookieOptions)`.
6. Return `token`.

### 4.3 `getCurrentUser(): Promise<SessionUser | null>`

```typescript
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_session")?.value;

  if (!token) {
    // E2E Test Fixture Fallback (Non-production only)
    return await resolveTestFixturePersona(cookieStore);
  }

  // Verify HMAC Signed Token
  const parsed = verifySessionToken(token);
  if (!parsed) {
    return await resolveTestFixturePersona(cookieStore);
  }

  // Fetch user record from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, parsed.userId),
  });

  if (!user || !user.isActive) {
    return null;
  }

  // Resolve academic identity (student profile or teacher profile)
  let name = user.email.split("@")[0];
  let studentProfileId: string | undefined;
  let teacherId: string | undefined;

  if (user.role === "STUDENT" || user.role === "CR") {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, user.id),
    });
    if (profile) {
      studentProfileId = profile.id;
      const student = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      if (student?.name) name = student.name;
    }
  } else if (user.role === "TEACHER") {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.email, user.email),
    });
    if (teacher) {
      teacherId = teacher.id;
      name = teacher.name;
    }
  } else if (user.role === "ADMIN") {
    name = "System Administrator";
  }

  return {
    id: user.id,
    email: user.email,
    name,
    role: user.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
    mustChangePassword: Boolean(user.mustChangePassword),
    isActive: Boolean(user.isActive),
    studentProfileId,
    teacherId,
  };
}
```

### 4.4 E2E Test Fixture Fallback Strategy

In `tests/fixtures/auth.fixture.ts`, Playwright tests inject mock cookies:
- `auth_session`: random 32-byte hex token.
- `APP_ROLE`: persona role (`"ADMIN"`, `"STUDENT"`, `"TEACHER"`, `"CR"`).
- `DEMO_STUDENT_ID`: student profile ID (`"sp_student_001"`, `"sp_newstudent_001"`, etc.).

To ensure 100% interoperability with the test harness without bypassing production security:
- If `verifySessionToken(token)` fails and `process.env.NODE_ENV !== "production"`:
  - Check `cookieStore.get("DEMO_STUDENT_ID")?.value`: Look up student profile by ID (`sp_student_001`) -> resolve linked user (`usr_student_001` or `newstudent`).
  - Check `cookieStore.get("APP_ROLE")?.value`: Look up active user of that role (`admin@classroom.edu.np` or `admin@classroom.os`).
  - Return resolved persona matching `SessionUser`.

### 4.5 `requireAuth(allowedRoles?: string[]): Promise<SessionUser>`

```typescript
export async function requireAuth(allowedRoles?: string[]): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.isActive) {
    redirect("/login?error=deactivated");
  }

  // Quarantine check: If mustChangePassword is true, force redirection to /change-password
  if (user.mustChangePassword) {
    // Check current path if available, or redirect
    redirect("/change-password");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Unauthorized role access: redirect to home dashboard or throw 403
    if (user.role === "STUDENT" || user.role === "CR") {
      redirect("/");
    } else {
      redirect("/admin/accounts");
    }
  }

  return user;
}
```

### 4.6 `invalidateSession(): Promise<void>`

```typescript
export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth_session");
  // Clean up legacy fixture cookies if present
  cookieStore.delete("APP_ROLE");
  cookieStore.delete("DEMO_STUDENT_ID");
}
```

---

## 5. File Structure for `src/lib/auth/`

```
src/lib/auth/
├── password.ts        # Scrypt hashing, verification, timingSafeEqual, temp password generator
├── token.ts           # HMAC-SHA256 token signing, expiration check, and validation
├── session.ts         # createSession, getCurrentUser, requireAuth, invalidateSession
├── rbac.ts            # RBAC permissions matrix and route checking utilities
└── index.ts           # Unified barrel export
```

### Legacy Compatibility
`src/lib/auth.ts` will re-export all methods from `src/lib/auth/index.ts` to prevent broken imports across existing components.

---

## 6. Verification Plan

| Component | Verification Target | Verification Method |
|---|---|---|
| **Password Crypto** | Scrypt compatibility with `src/db/seed.ts` | Verify that `verifyPassword("AdminPassword123!", defaultAdminPass)` returns `true` for hashes seeded in `src/db/seed.ts`. |
| **Timing Attack Resistance** | `timingSafeEqual` assertion | Validate that mismatched lengths or invalid signatures do not throw and take constant time. |
| **Session Lifecycle** | Token creation, cookie setting, expiration | Test `createSession`, cookie extraction via `await cookies()`, and `invalidateSession`. |
| **Quarantine & RBAC** | `mustChangePassword` & Role Guards | Execute Playwright test suite `tests/e2e/auth-lifecycle.spec.ts`. |
