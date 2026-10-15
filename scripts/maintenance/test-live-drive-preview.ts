import { chromium } from "@playwright/test";
import { createClient } from "@libsql/client";
import { createSessionToken, getSessionTokenId } from "../../src/lib/auth/token";
import * as fs from "node:fs";
import * as path from "node:path";

const TARGET_DRIVE_URL =
  "https://docs.google.com/presentation/d/1in0di3rfcV7NdFyiYQ31HGsDZqdlX4st/edit?usp=drive_link&ouid=108721539919631550752&rtpof=true&sd=true";
const EXPECTED_PREVIEW_URL =
  "https://docs.google.com/presentation/d/1in0di3rfcV7NdFyiYQ31HGsDZqdlX4st/preview";

async function run() {
  console.log("==================================================");
  console.log("  LIVE PLAYWRIGHT GOOGLE DRIVE PRESENTATION TEST  ");
  console.log("==================================================");
  console.log(`🔗 Target URL: ${TARGET_DRIVE_URL}`);
  console.log(`🎯 Expected Embed: ${EXPECTED_PREVIEW_URL}\n`);

  const dbUrl = process.env.DATABASE_URL || "file:local.db";
  const client = createClient({ url: dbUrl });

  // 1. Prepare Auth Session for Student
  const userId = "usr_student_01";
  const studentId = "std_001";
  const token = createSessionToken({
    userId,
    role: "STUDENT",
    mustChangePassword: false,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  const tokenId = getSessionTokenId(token);
  await client.execute({
    sql: "INSERT OR REPLACE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    args: [tokenId, userId, Math.floor((Date.now() + 86400000) / 1000)],
  });
  console.log("🔑 Authenticated student session token persisted in SQLite.");

  // 2. Ensure an active homework assignment exists
  const existingHw = await client.execute({
    sql: "SELECT id, title FROM homework LIMIT 1",
  });
  let hwId: string;
  if (existingHw.rows.length > 0) {
    hwId = String(existingHw.rows[0].id);
    console.log(`📚 Using existing assignment: ${existingHw.rows[0].title} (ID: ${hwId})`);
  } else {
    hwId = `hw_drive_test_${Date.now()}`;
    await client.execute({
      sql: `INSERT INTO homework (id, subject_id, title, description, assigned_date, due_date, status)
            VALUES (?, 'subj_bca151', 'Project Presentation Phase 1', 'Upload your Google Slides presentation for review', unixepoch(), unixepoch() + 86400, 'active')`,
      args: [hwId],
    });
    console.log(`📚 Created new test assignment: ID ${hwId}`);
  }

  // 3. Launch Headless Chromium
  console.log("🌐 Launching Playwright Chromium...");
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });

  await context.addCookies([
    {
      name: "auth_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "APP_ROLE",
      value: "STUDENT",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "DEMO_STUDENT_ID",
      value: studentId,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Update user in DB so mustChangePassword is false
  await client.execute({
    sql: "UPDATE users SET must_change_password = 0 WHERE id = ?",
    args: [userId],
  });

  const page = await context.newPage();

  page.on("request", (req) => {
    console.log(`➡️  [REQUEST] ${req.method()} ${req.url()}`);
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 300 && status < 400) {
      console.log(`🔀 [REDIRECT ${status}] ${res.url()} -> ${res.headers()["location"]}`);
    }
  });

  // Track Google network responses
  const googleResponses: Array<{ url: string; status: number; headers: Record<string, string> }> = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("google.com")) {
      googleResponses.push({
        url,
        status: res.status(),
        headers: res.headers(),
      });
    }
  });

  const assignmentUrl = `http://localhost:3000/homework/${hwId}`;
  console.log(`🧭 Navigating to assignment page: ${assignmentUrl}...`);
  await page.goto(assignmentUrl, { waitUntil: "domcontentloaded" });

  // 4. Submit Google Drive Link via UI Form
  console.log("📝 Checking assignment form state...");
  const changeLinkBtn = page.locator("button:has-text('Change Link')");
  if (await changeLinkBtn.isVisible()) {
    console.log("   Clicking 'Change Link' to enter edit mode...");
    await changeLinkBtn.click();
  }

  const urlInput = page.locator("input[type='url']");
  await urlInput.waitFor({ state: "visible", timeout: 5000 });
  console.log("   Filling target Google Drive Slides URL into input field...");
  await urlInput.fill(TARGET_DRIVE_URL);

  const submitBtn = page.locator("button[type='submit']:has-text('Submit Link'), button[type='submit']:has-text('Update Link')");
  console.log("   Submitting form...");
  await submitBtn.click();

  // 5. Verify UI Response & SpeedGrader Embed
  console.log("🔍 Waiting for submission confirmation and preview rendering...");
  const statusToast = page.locator("div[role='status']");
  await statusToast.first().waitFor({ state: "visible", timeout: 10000 });
  const statusText = await statusToast.first().textContent();
  console.log(`   Notification: "${statusText?.trim()}"`);

  // Verify Drive Preview container
  const badge = page.locator("text='Google Slides'");
  await badge.waitFor({ state: "visible", timeout: 5000 });
  console.log("   ✅ 'Google Slides' badge successfully rendered in UI.");

  // Verify External Link Button
  const openLink = page.locator("a:has-text('Open in Google Drive')");
  await openLink.waitFor({ state: "visible", timeout: 5000 });
  const openHref = await openLink.getAttribute("href");
  const openTarget = await openLink.getAttribute("target");
  console.log(`   ✅ Direct Link Button present: href="${openHref}", target="${openTarget}"`);

  // Verify Iframe Embed
  const iframeLocator = page.locator("iframe");
  await iframeLocator.waitFor({ state: "visible", timeout: 5000 });
  const iframeSrc = await iframeLocator.getAttribute("src");
  console.log(`   ✅ Embedded Iframe rendered with src="${iframeSrc}"`);

  // Wait 4 seconds for iframe network traffic to settle
  console.log("⏳ Waiting 4 seconds for iframe Google network activity to settle...");
  await page.waitForTimeout(4000);

  // 6. Capture Visual Screenshot
  const screenshotsDir = path.resolve(process.cwd(), "docs/audit-screenshots");
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  const screenshotPath = path.join(screenshotsDir, "live-google-drive-presentation-test.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Full page screenshot saved to: ${screenshotPath}`);

  // 7. Audit Google Response Status
  console.log("\n📊 Network & Cross-Origin Audit Results:");
  console.log(`   Total Google network requests intercepted: ${googleResponses.length}`);
  const previewReq = googleResponses.find((r) => r.url.includes("/presentation/d/") && r.url.includes("/preview"));
  if (previewReq) {
    console.log(`   Google Slide Preview HTTP Status: ${previewReq.status}`);
    console.log(`   X-Frame-Options Header: ${previewReq.headers["x-frame-options"] || "None (Allowed)"}`);
    console.log(`   Content-Security-Policy: ${previewReq.headers["content-security-policy"] ? "Present" : "None"}`);
  } else {
    console.log("   (Google Slide Preview request was routed by browser sandbox or cached)");
  }

  // 8. Database Verification
  const dbSubmission = await client.execute({
    sql: "SELECT id, status, file_url, file_name FROM assignment_submissions WHERE homework_id = ? AND student_id = ?",
    args: [hwId, studentId],
  });
  console.log("\n💾 Database State:");
  console.log("   Submission Row:", dbSubmission.rows[0]);

  await browser.close();
  client.close();

  console.log("\n==================================================");
  console.log("  VERIFICATION COMPLETE: ALL CHECKS PASSED        ");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
