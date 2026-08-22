import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { createClient } from "@libsql/client";
import { TEST_PERSONAS } from "./seed-data";
import { createSessionToken, getSessionTokenId } from "../../src/lib/auth/token";
import { sessions } from "../../src/db/schema";

/**
 * Persists the session row required by server-side session validation.
 * Since S10 revocation (sessions table), a valid HMAC cookie alone is not
 * enough — getCurrentUser() hard-denies without a matching unexpired row.
 */
async function persistSessionRow(token: string, userId: string, expiresAtMs: number): Promise<void> {
  const url = process.env.DATABASE_URL || "file:local.test.db";
  if (!url.startsWith("file:")) {
    throw new Error(
      `auth.fixture refusing to write session rows against non-local DATABASE_URL: ${url}`
    );
  }
  const client = createClient({ url });
  try {
    // drizzle `{ mode: "timestamp" }` stores epoch SECONDS; created_at has a DB default.
    // SQLITE_BUSY can surface when the dev server holds a write lock during
    // global-setup reseeding — retry briefly rather than fail the persona.
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await client.execute({
          sql: "INSERT OR IGNORE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
          args: [getSessionTokenId(token), userId, Math.floor(expiresAtMs / 1000)],
        });
        return;
      } catch (err) {
        lastError = err;
        const message = String(err);
        if (!message.includes("SQLITE_BUSY") && !message.includes("database is locked")) throw err;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw lastError;
  } finally {
    client.close();
  }
}

export type AuthPersonas = {
  adminPage: Page;
  teacherPage: Page;
  crPage: Page;
  studentPage: Page;
  newStudentPage: Page;
  unauthorizedPage: Page;
  guestPage: Page;
};

/**
 * Creates an active session token and injects HTTP-only cookies into the browser context.
 * Sets both `auth_session` and legacy compatibility cookies (`APP_ROLE`, `DEMO_STUDENT_ID`).
 */
export async function injectAuthSession(
  context: BrowserContext,
  persona: typeof TEST_PERSONAS[keyof typeof TEST_PERSONAS],
  baseURL: string = "http://localhost:3001"
): Promise<string> {
  const token = createSessionToken({
    userId: persona.id,
    role: persona.role,
    mustChangePassword: Boolean(persona.mustChangePassword),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  await persistSessionRow(token, persona.id, Date.now() + 30 * 24 * 60 * 60 * 1000);
  const url = new URL(baseURL);

  const cookies = [
    {
      name: "auth_session",
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
    {
      name: "APP_ROLE",
      value: persona.role,
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    },
  ];

  if ("studentProfileId" in persona && persona.studentProfileId) {
    cookies.push({
      name: "DEMO_STUDENT_ID",
      value: persona.studentProfileId,
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    });
  }

  await context.addCookies(cookies);
  return token;
}

export const test = base.extend<AuthPersonas>({
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.admin, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  teacherPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.teacher, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  crPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.cr, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  studentPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.activeStudent, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  newStudentPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.newStudentQuarantined, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  unauthorizedPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext();
    await injectAuthSession(context, TEST_PERSONAS.unauthorizedStudent, baseURL);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  guestPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect } from "@playwright/test";
