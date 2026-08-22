import { chromium } from "@playwright/test";

const base = process.env.PROBE_URL || "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Real login as seeded student
  await page.goto(base + "/login");
  await page.getByPlaceholder(/student@classroom/).or(page.locator("input[type='email']").first()).fill("student@classroom.edu.np");
  await page.locator("input[type='password']").first().fill("StudentPassword123!");
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL((u) => !String(u).includes("/login"), { timeout: 20000 }).catch(() => {});
  console.log("after login:", page.url());

  // Class History page
  await page.goto(base + "/lecture-rows").catch(() => {});
  await page.goto(base + "/lecture-logs");
  await page.waitForLoadState("networkidle").catch(() => {});

  const heading = await page.locator("h2").first().textContent();
  console.log("heading:", heading);

  const totalCards = await page.locator("a[href^='/sessions/']").count();
  console.log("total history rows:", totalCards);
  console.log("sidebar label:", await page.locator("aside a[href='/lecture-logs']").first().textContent());

  await page.screenshot({ path: ".runtime/shots/class-history-default.png" });

  // Search for something unlikely -> empty state, then Clear button appears?
  await page.getByTestId("history-search").fill("zzzznomatch");
  await page.getByTestId("history-filter-btn").click();
  await page.waitForLoadState("networkidle").catch(() => {});
  console.log("search url has q:", page.url().includes("q=zzzznomatch"));
  console.log(
    "empty-state:",
    (await page.getByText(/No classes match your search or filter/i).count()) > 0,
    "| clear btn:", await page.getByTestId("history-clear-btn").count()
  );
  await page.screenshot({ path: ".runtime/shots/class-history-filtered-empty.png" });

  // Clear restores everything
  if (await page.getByTestId("history-clear-btn").count()) {
    await page.getByTestId("history-clear-btn").click();
    await page.waitForURL((u) => !/[?&](q|subject)=/.test(String(u)), { timeout: 15000 });
    await page.getByTestId("history-search").waitFor({ state: "visible", timeout: 15000 });
    console.log("after clear, url clean:", !/[?&](q|subject)=/.test(page.url()));
    console.log("rows restored:", await page.locator("a[href^='/sessions/']").count());
  }

  // Subject filter via URL directly
  await page.goto(base + "/lecture-logs?subject=");
  const subjectOptions = await page.getByTestId("history-subject").locator("option").count();
  console.log("subject options:", subjectOptions);

  await browser.close();
})();
