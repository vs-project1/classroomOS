import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import { createSessionToken, getSessionTokenId } from "../src/lib/auth/token";
import { TEST_PERSONAS } from "../tests/fixtures/seed-data";

const baseURL = process.env.PROBE_URL || "http://localhost:3002";

const ROUTES = [
  "/admin",
  "/admin/students",
  "/admin/teachers",
  "/admin/accounts",
  "/admin/subjects",
  "/admin/homework",
  "/admin/notices",
  "/admin/events",
  "/admin/attendance",
];

(async () => {
  const persona = TEST_PERSONAS.admin;
  const token = createSessionToken({
    userId: persona.id,
    role: persona.role,
    mustChangePassword: false,
    expiresAt: Date.now() + 30 * 864e5,
  });
  const client = createClient({ url: "file:local.test.db" });
  await client.execute({
    sql: "INSERT OR IGNORE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    args: [getSessionTokenId(token), persona.id, Math.floor((Date.now() + 30 * 864e5) / 1000)],
  });
  client.close();

  const url = new URL(baseURL);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    { name: "auth_session", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();

  for (const route of ROUTES) {
    const resp = await page.goto(baseURL + route);
    const h1 = await page.locator("h1").first().textContent().catch(() => "(no h1)");
    console.log(`${route} -> ${resp?.status()} | h1: ${String(h1).slice(0, 40)}`);
  }

  await browser.close();
})();
