# Scope: Milestone 2 — Auth, Security, RBAC & Admin Accounts Console

## Architecture
Milestone 2 establishes the zero-trust security perimeter, session-based authentication, mandatory quarantine flow, role-based access control (RBAC), and administrative user management console for Classroom OS.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                          │
│                                                                        │
│   src/middleware.ts (Session validation, RBAC, Quarantine intercept)   │
│   ├── Public Routes: /login, /api/uploadthing                          │
│   ├── Quarantine Route: /change-password (mustChangePassword === 1)    │
│   ├── Admin Routes: /admin/* (requires role === 'ADMIN')               │
│   └── Authenticated Academic Routes: /* (STUDENT, TEACHER, CR, ADMIN)  │
├────────────────────────────────────────────────────────────────────────┤
│                           Domain Services                              │
│   src/lib/auth/                                                        │
│   ├── password.ts: node:crypto scrypt hashing (N=16384, r=8, p=1)      │
│   ├── session.ts: HTTP-only 'auth_session' cookies, 30-day TTL,        │
│   │   getCurrentUser(), requireAuth(), createSession(), invalidate()   │
│   └── index.ts: Unified export                                         │
├────────────────────────────────────────────────────────────────────────┤
│                     Server Actions & UI Views                          │
│   ├── /login (src/app/(auth)/login/page.tsx, LoginForm, loginAction)   │
│   ├── /change-password (src/app/(auth)/change-password/page.tsx)       │
│   └── /admin/accounts (src/app/(admin)/admin/accounts/page.tsx)        │
│       ├── KPI Cards (Total, Students, Teachers, CR, At-Risk)           │
│       ├── Roster Table with Search, Filter by Role/Status              │
│       ├── Create Account Dialog (Auto-generate temp password, copy)    │
│       └── Server Actions: createUser, updateUser, deactivateUser,      │
│           resetPassword, changePassword                                │
└────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory Mapping
| # | Feature | Description | Target Files |
|---|---------|-------------|--------------|
| F4 | Session-Based Authentication | `auth_session` HTTP-only cookie, 30-day TTL, scrypt password hashing, session validation | `src/lib/auth/*`, `src/app/(auth)/login/*` |
| F5 | Admin-Controlled Provisioning | Admin creation of Student, Teacher, CR with temporary password generation and clipboard copying | `src/app/(admin)/admin/accounts/*`, `src/app/actions/accounts.ts` |
| F6 | Mandatory Password Quarantine | Forced redirection to `/change-password` when `mustChangePassword === true`; unlock upon setting >=8 char password | `src/middleware.ts`, `src/app/(auth)/change-password/*` |
| F7 | Role-Based Access Control (RBAC) | Strict enforcement across `src/middleware.ts`, server components (`requireAuth`), and server actions | `src/middleware.ts`, `src/lib/auth/session.ts` |
| F8 | Admin Accounts Console | `/admin/accounts` with metrics, search/filter table, modal, edit/deactivate, reset password | `src/app/(admin)/admin/accounts/*` |

## Interface Contracts

### Auth Service (`src/lib/auth/`)
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

export async function getCurrentUser(): Promise<SessionUser | null>;
export async function requireAuth(allowedRoles?: Array<"ADMIN" | "TEACHER" | "CR" | "STUDENT">): Promise<SessionUser>;
export async function createSession(userId: string): Promise<string>;
export async function invalidateSession(): Promise<void>;
export async function hashPassword(plainText: string): Promise<string>;
export async function verifyPassword(plainText: string, hash: string): Promise<boolean>;
```

### Server Actions Response Contract
```typescript
export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};
```
