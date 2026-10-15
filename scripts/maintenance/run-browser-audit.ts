import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

async function runBrowserAudit() {
  const screenshotsDir = path.join(process.cwd(), "docs", "audit-screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  console.log("================================================================================");
  console.log("  Classroom OS — Live Playwright Browser Verification & Screenshot Audit");
  console.log("================================================================================\n");

  // 1. Mobile Take Attendance Audit (390x844)
  console.log("📸 AUDIT 1: Mobile Take Attendance (/cr/take-attendance) [390x844]");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobileContext.newPage();

  // Login as CR
  await mobilePage.goto("http://localhost:3000/login");
  await mobilePage.fill('input[type="email"]', "aashish.khatri@classroom.os");
  await mobilePage.fill('input[type="password"]', "StudentPassword123!");
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL("http://localhost:3000/cr", { timeout: 15000 });

  // Navigate to Take Attendance
  await mobilePage.goto("http://localhost:3000/cr/take-attendance");
  await mobilePage.waitForSelector('[data-testid="daily-attendance-result-banner"], table, .grid-cols-4');
  await mobilePage.waitForTimeout(1000); // allow layout stabilization

  const mobileScreenshotPath = path.join(screenshotsDir, "01-cr-take-attendance-mobile.png");
  await mobilePage.screenshot({ path: mobileScreenshotPath });
  console.log(`  ✓ Saved: ${mobileScreenshotPath}`);

  // Scroll inner container to show student cards with all students
  await mobilePage.evaluate(() => {
    const el = document.querySelector(".overflow-y-auto");
    if (el) el.scrollTop = 540;
  });
  await mobilePage.waitForTimeout(500);

  const mobileScrolledPath = path.join(screenshotsDir, "01b-cr-take-attendance-mobile-cards.png");
  await mobilePage.screenshot({ path: mobileScrolledPath });
  console.log(`  ✓ Saved: ${mobileScrolledPath}`);

  // Test mobile card interaction: tap "Absent" on first student card
  const cardAbsentBtn = mobilePage.locator('.sm\\:hidden button:has-text("Absent")').first();
  if (await cardAbsentBtn.count() > 0) {
    await cardAbsentBtn.click();
    console.log("  ✓ Tapped 'Absent' button on first student card");
    await mobilePage.waitForTimeout(500);

    const mobileMarkedPath = path.join(screenshotsDir, "01c-cr-take-attendance-mobile-marked.png");
    await mobilePage.screenshot({ path: mobileMarkedPath });
    console.log(`  ✓ Saved: ${mobileMarkedPath}`);
  }

  // 2. Desktop Take Attendance Audit (1280x800)
  console.log("\n📸 AUDIT 2: Desktop Take Attendance (/cr/take-attendance) [1280x800]");
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();

  // Login as CR on Desktop
  await desktopPage.goto("http://localhost:3000/login");
  await desktopPage.fill('input[type="email"]', "aashish.khatri@classroom.os");
  await desktopPage.fill('input[type="password"]', "StudentPassword123!");
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL("http://localhost:3000/cr", { timeout: 15000 });

  await desktopPage.goto("http://localhost:3000/cr/take-attendance");
  await desktopPage.waitForSelector("table");
  await desktopPage.waitForTimeout(1000);

  const desktopScreenshotPath = path.join(screenshotsDir, "02-cr-take-attendance-desktop.png");
  await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log(`  ✓ Saved: ${desktopScreenshotPath}`);

  // 3. Student /today Timeline Stream Audit (1280x800)
  console.log("\n📸 AUDIT 3: Student /today Timeline Stream (/today) [1280x800]");
  const studentContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const studentPage = await studentContext.newPage();

  await studentPage.goto("http://localhost:3000/login");
  await studentPage.fill('input[type="email"]', "aakriti.thapa@classroom.os");
  await studentPage.fill('input[type="password"]', "StudentPassword123!");
  await studentPage.click('button[type="submit"]');
  await studentPage.waitForURL("http://localhost:3000/", { timeout: 15000 });
  await studentPage.goto("http://localhost:3000/today");
  await studentPage.waitForSelector('[data-testid="timeline-river"]');
  await studentPage.waitForTimeout(1000);

  const todayScreenshotPath = path.join(screenshotsDir, "03-student-today-stream.png");
  await studentPage.screenshot({ path: todayScreenshotPath, fullPage: true });
  console.log(`  ✓ Saved: ${todayScreenshotPath}`);

  // 4. Weekly Routine Cards View Audit
  console.log("\n📸 AUDIT 4: Weekly Routine Cards View (/routine) [1280x800]");
  await studentPage.goto("http://localhost:3000/routine");
  await studentPage.waitForSelector("button:has-text('Cards')");
  await studentPage.click("button:has-text('Cards')");
  await studentPage.waitForTimeout(1000);

  const routineCardsScreenshotPath = path.join(screenshotsDir, "04-routine-cards-view.png");
  await studentPage.screenshot({ path: routineCardsScreenshotPath, fullPage: true });
  console.log(`  ✓ Saved: ${routineCardsScreenshotPath}`);

  // 5. Teacher Resources & Uploads Audit
  console.log("\n📸 AUDIT 5: Teacher Resources Library (/teacher/resources) [1280x800]");
  const teacherContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const teacherPage = await teacherContext.newPage();

  await teacherPage.goto("http://localhost:3000/login");
  await teacherPage.fill('input[type="email"]', "rajesh.shrestha@classroom.os");
  await teacherPage.fill('input[type="password"]', "TeacherPassword123!");
  await teacherPage.click('button[type="submit"]');
  await teacherPage.waitForURL("http://localhost:3000/teacher", { timeout: 15000 });

  await teacherPage.goto("http://localhost:3000/teacher/resources");
  await teacherPage.waitForTimeout(1000);

  const teacherResourcesScreenshotPath = path.join(screenshotsDir, "05-teacher-resources.png");
  await teacherPage.screenshot({ path: teacherResourcesScreenshotPath, fullPage: true });
  console.log(`  ✓ Saved: ${teacherResourcesScreenshotPath}`);

  await browser.close();
  console.log("\n================================================================================");
  console.log("  ALL BROWSER AUDIT SCREENSHOTS CAPTURED SUCCESSFULLY!");
  console.log("================================================================================");
}

runBrowserAudit().catch((err) => {
  console.error("FATAL ERROR during browser audit:", err);
  process.exit(1);
});
