import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import fs from "node:fs";
import { createSessionToken, getSessionTokenId } from "../src/lib/auth/token";
import { TEST_PERSONAS } from "../tests/fixtures/seed-data";

const base = "http://localhost:3002";
const outDir = ".runtime/shots";

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
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
  for (const [name, path] of [
    ["notifications-page", "/notifications"],
    ["class-history-filters", "/lecture-logs?semester=4"],
    ["class-history-mobile", "/lecture-logs?semester=4"],
  ] as const) {
    const context = await browser.newContext({
      viewport: name.includes("mobile") ? { width: 375, height: 667 } : { width: 1280, height: 800 },
    });
    await context.addCookies([
      { name: "auth_session", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    await page.goto(base + path);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/${name}.png` });
    console.log("shot:", name);
    await context.close();
  }
  await browser.close();
})();
