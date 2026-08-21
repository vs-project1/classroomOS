import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import fs from "node:fs";
import { createSessionToken, getSessionTokenId } from "../src/lib/auth/token";
import { TEST_PERSONAS } from "../tests/fixtures/seed-data";

const baseURL = process.env.PROBE_URL || "http://localhost:3002";
const outDir = ".runtime/shots";

type Shot = { persona: keyof typeof TEST_PERSONAS; path: string; name: string; vp: { w: number; h: number } };

const shots: Shot[] = [
  { persona: "activeStudent", path: "/", name: "student-home-desktop", vp: { w: 1280, h: 800 } },
  { persona: "activeStudent", path: "/today", name: "student-today-tablet", vp: { w: 768, h: 1024 } },
  { persona: "activeStudent", path: "/", name: "student-home-mobile", vp: { w: 375, h: 667 } },
  { persona: "activeStudent", path: "/today", name: "student-today-mobile", vp: { w: 375, h: 667 } },
  { persona: "teacher", path: "/today", name: "teacher-today-desktop", vp: { w: 1280, h: 800 } },
  { persona: "teacher", path: "/teacher", name: "teacher-home-mobile", vp: { w: 375, h: 667 } },
  { persona: "cr", path: "/cr", name: "cr-dashboard-desktop", vp: { w: 1280, h: 800 } },
  { persona: "admin", path: "/admin", name: "admin-dashboard-desktop", vp: { w: 1280, h: 800 } },
  { persona: "admin", path: "/admin", name: "admin-dashboard-mobile", vp: { w: 375, h: 667 } },
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const dbUrl = "file:local.test.db";
  if (!dbUrl.startsWith("file:")) throw new Error("refusing non-local");
  const browser = await chromium.launch();

  for (const shot of shots) {
    const persona = TEST_PERSONAS[shot.persona];
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
    const context = await browser.newContext({ viewport: { width: shot.vp.w, height: shot.vp.h } });
    await context.addCookies([
      { name: "auth_session", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    await page.goto(baseURL + shot.path);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${outDir}/${shot.name}.png`, fullPage: false });
    console.log("shot:", shot.name);
    await context.close();
  }

  await browser.close();
})();
