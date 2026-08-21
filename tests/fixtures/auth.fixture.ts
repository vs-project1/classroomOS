import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { TEST_PERSONAS } from "./seed-data";
import { createSessionToken } from "../../src/lib/auth/token";

export type AuthPersonas = {
  adminPage: Page;
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
