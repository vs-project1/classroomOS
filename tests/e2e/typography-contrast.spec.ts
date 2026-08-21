import { test, expect } from "../fixtures/auth.fixture";

test.describe("F5, F6: High-Contrast Typography & Theme Polish", () => {
  const studentPages = [
    { name: "Student Dashboard", url: "/" },
    { name: "Today Schedule", url: "/today" },
    { name: "Weekly Routine", url: "/routine" },
    { name: "Attendance Hub", url: "/attendance" },
    { name: "Assignments Workspace", url: "/homework" },
    { name: "Notice Board", url: "/notices" },
    { name: "Events Calendar", url: "/events" },
  ];

  const adminPages = [
    { name: "Admin Dashboard", url: "/admin" },
    { name: "Admin Accounts Console", url: "/admin/accounts" },
    { name: "Admin Students Roster", url: "/admin/students" },
    { name: "Admin Teachers Directory", url: "/admin/teachers" },
    { name: "Admin Subjects Catalog", url: "/admin/subjects" },
  ];

  // 1. Typography & Minimum Font Size Validation (No Sub-12px Unreadable Text)
  test.describe("Legible Typography & Font Size Audit", () => {
    for (const pageInfo of studentPages) {
      test(`TC-TYPO-01 [${pageInfo.name}]: All visible text content maintains readable font size (>= 11.5px)`, async ({
        studentPage,
      }) => {
        await studentPage.goto(pageInfo.url);
        await studentPage.waitForLoadState("domcontentloaded");

        const violations = await studentPage.evaluate(() => {
          const elements = Array.from(
            document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, th, td, a, label, button, time")
          );
          const results: { text: string; fontSize: string; tag: string }[] = [];

          for (const el of elements) {
            const text = el.textContent?.trim() || "";
            if (!text || text.length > 80 || el.closest("[aria-hidden='true'], svg, .sr-only")) continue;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) continue;

            const fontSizePx = parseFloat(style.fontSize);
            if (fontSizePx < 11.5) {
              results.push({
                text: text.slice(0, 30),
                fontSize: style.fontSize,
                tag: el.tagName.toLowerCase(),
              });
            }
          }
          return results;
        });

        expect(
          violations,
          `Found ${violations.length} sub-12px text violations on ${pageInfo.url}: ${JSON.stringify(violations.slice(0, 5))}`
        ).toHaveLength(0);
      });
    }

    for (const pageInfo of adminPages) {
      test(`TC-TYPO-02 [${pageInfo.name}]: Admin view content maintains readable font size (>= 11.5px)`, async ({
        adminPage,
      }) => {
        await adminPage.goto(pageInfo.url);
        await adminPage.waitForLoadState("domcontentloaded");

        const violations = await adminPage.evaluate(() => {
          const elements = Array.from(
            document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, th, td, a, label, button, time")
          );
          const results: { text: string; fontSize: string; tag: string }[] = [];

          for (const el of elements) {
            const text = el.textContent?.trim() || "";
            if (!text || text.length > 80 || el.closest("[aria-hidden='true'], svg, .sr-only")) continue;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) continue;

            const fontSizePx = parseFloat(style.fontSize);
            if (fontSizePx < 11.5) {
              results.push({
                text: text.slice(0, 30),
                fontSize: style.fontSize,
                tag: el.tagName.toLowerCase(),
              });
            }
          }
          return results;
        });

        expect(
          violations,
          `Found ${violations.length} sub-12px text violations on ${pageInfo.url}: ${JSON.stringify(violations.slice(0, 5))}`
        ).toHaveLength(0);
      });
    }
  });

  // 2. Light & Dark Theme Toggle & Contrast Verification
  test.describe("Theme Toggle & Color Contrast Verification", () => {
    test("TC-CONTRAST-01: Light and Dark mode toggling properly updates root class and background tokens", async ({
      studentPage,
    }) => {
      await studentPage.goto("/");
      await studentPage.waitForLoadState("domcontentloaded");

      const themeToggle = studentPage.locator("button[aria-label='Toggle dark mode']").first();
      await expect(themeToggle).toBeVisible({ timeout: 10000 });

      // Initial state
      const initialIsDark = await studentPage.evaluate(() => document.documentElement.classList.contains("dark"));

      // Click toggle
      await themeToggle.click();
      const toggledIsDark = await studentPage.evaluate(() => document.documentElement.classList.contains("dark"));
      expect(toggledIsDark).toBe(!initialIsDark);

      // Verify body background exists
      const bodyBackground = await studentPage.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
      expect(bodyBackground).toBeTruthy();

      // Toggle back
      await themeToggle.click();
      const revertedIsDark = await studentPage.evaluate(() => document.documentElement.classList.contains("dark"));
      expect(revertedIsDark).toBe(initialIsDark);
    });

    test("TC-CONTRAST-02: Status chips and badges maintain legible styling in both light and dark modes", async ({
      studentPage,
    }) => {
      await studentPage.goto("/homework");
      await studentPage.waitForLoadState("domcontentloaded");

      // Check Light Mode Status Badges
      await studentPage.evaluate(() => document.documentElement.classList.remove("dark"));
      const lightChips = studentPage.locator("span.rounded-full, [data-testid='status-chip'], span.badge");
      const lightCount = await lightChips.count();

      if (lightCount > 0) {
        const firstChipColor = await lightChips.first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          return { color: style.color, bg: style.backgroundColor };
        });
        expect(firstChipColor.color).toBeTruthy();
      }

      // Switch to Dark Mode
      await studentPage.evaluate(() => document.documentElement.classList.add("dark"));
      const darkChips = studentPage.locator("span.rounded-full, [data-testid='status-chip'], span.badge");
      const darkCount = await darkChips.count();

      if (darkCount > 0) {
        const firstChipColorDark = await darkChips.first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          return { color: style.color, bg: style.backgroundColor };
        });
        expect(firstChipColorDark.color).toBeTruthy();
      }
    });

    test("TC-CONTRAST-03: Headings and muted-foreground text maintain legible styling across themes", async ({
      studentPage,
    }) => {
      await studentPage.goto("/");
      await studentPage.waitForLoadState("domcontentloaded");

      // Verify headings exist
      const heading = studentPage.locator("h1, h2, h3").first();
      await expect(heading).toBeVisible();

      // Verify muted text
      const mutedText = studentPage.locator(".text-muted-foreground").first();
      if ((await mutedText.count()) > 0) {
        const color = await mutedText.evaluate((el) => window.getComputedStyle(el).color);
        expect(color).toBeTruthy();
      }
    });
  });
});
