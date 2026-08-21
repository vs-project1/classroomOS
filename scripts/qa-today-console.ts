import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import { createSessionToken, getSessionTokenId } from "../src/lib/auth/token";
import { TEST_PERSONAS } from "../tests/fixtures/seed-data";

const baseURL = process.env.PROBE_URL || "http://localhost:3002";

(async () => {
  const dbUrl = "file:local.test.db";
  const browser = await chromium.launch();

  for (const key of ["activeStudent", "teacher", "cr"] as const) {
    const persona = TEST_PERSONAS[key];
    const token = createSessionToken({
      userId: persona.id,
      role: persona.role,
      mustChangePassword: false,
      expiresAt: Date.now() + 30 * 864e5,
    });
    const client = createClient({ url: dbUrl });
    await client.execute({
      sql: "INSERT OR IGNORE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
      args: [getSessionTokenId(token), persona.id, Math.floor((Date.now() + 30 * 864e5) / 1000)],
    });
    client.close();

    const url = new URL(baseURL);
    const context = await browser.newContext();
    await context.addCookies([
      { name: "auth_session", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text().slice(0, 200));
    });
    page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));

    await page.goto(baseURL + "/today");
    await page.waitForLoadState("networkidle").catch(() => {});

    const checks: Record<string, boolean | number> = {};
    checks.greetingVisible = await page.getByTestId("today-greeting").isVisible();
    checks.currentNextCount = await page.getByTestId("current-next-class").count();
    checks.deadlinesCount = await page.getByTestId("deadlines-card").count();
    checks.attentionCount = await page.getByTestId("attention-card").count();
    checks.dayStrip = await page.getByTestId("timeline-session-card").count();
    checks.consoleErrors = errors.length;

    console.log(`[${key}]`, JSON.stringify(checks));
    if (errors.length) console.log(`[${key}] first-error:`, errors[0]);
    await context.close();
  }

  await browser.close();
})();
