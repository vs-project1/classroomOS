import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import { createSessionToken, getSessionTokenId } from "../src/lib/auth/token";
import { TEST_PERSONAS } from "../tests/fixtures/seed-data";

const base = "http://localhost:3002";

(async () => {
  const persona = TEST_PERSONAS.activeStudent;
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

  const url = new URL(base);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "auth_session", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();

  const targets = [
    "/",
    "/notifications",
    "/lecture-logs",
    "/lecture-logs?semester=4&date=&unit=subj_dsa_01",
    "/today",
    "/subjects/data-structures-and-algorithms?tab=syllabus",
    "/homework",
    "/attendance",
  ];

  for (const path of targets) {
    const errors: string[] = [];
    const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
      if (msg.type() === "error") errors.push(msg.text().slice(0, 160));
    };
    const onPageError = (err: Error) => errors.push("PAGEERROR " + String(err).slice(0, 160));
    page.on("console", onConsole);
    page.on("pageerror", onPageError);

    await page.goto(base + path).catch((e) => errors.push("GOTOFAIL " + String(e).slice(0, 120)));
    await page.waitForLoadState("networkidle").catch(() => {});
    // open/close mobile drawer to exercise Sheet effects
    if (path === "/") {
      await page.setViewportSize({ width: 375, height: 667 });
      const burger = page.locator("button[aria-label='Open menu']");
      if (await burger.isVisible().catch(() => false)) {
        await burger.click();
        await page.waitForTimeout(400);
        await page.keyboard.press("Escape");
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    console.log(`${path} -> ${errors.length ? "ERRORS" : "clean"}`);
    for (const e of errors.slice(0, 3)) console.log("   ", e);
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }

  await browser.close();
})();
