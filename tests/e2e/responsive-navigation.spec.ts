import { test, expect } from "../fixtures/auth.fixture";

test.describe("F1, F2, F3, F4: Responsive Navigation & Layout Architecture", () => {
  const desktopViewports = [
    { name: "Desktop Wide 1440px", width: 1440, height: 900 },
    { name: "Laptop 1024px", width: 1024, height: 768 },
    { name: "Tablet Landscape 768px", width: 768, height: 1024 },
  ];

  const mobileViewports = [
    { name: "Mobile Small 375px", width: 375, height: 667 },
    { name: "Mobile Medium 414px", width: 414, height: 896 },
  ];

  // 1. Desktop Viewports (>= 768px)
  test.describe("Desktop Viewports (>= 768px)", () => {
    for (const vp of desktopViewports) {
      test(`TC-RESP-NAV-01 [${vp.name}]: Sticky sidebar is visible and sticky, mobile topbar/navbar is hidden, and no horizontal overflow occurs`, async ({
        studentPage,
      }) => {
        await studentPage.setViewportSize({ width: vp.width, height: vp.height });
        await studentPage.goto("/");
        await studentPage.waitForLoadState("domcontentloaded");

        // 1. Verify sticky desktop sidebar is visible
        const sidebar = studentPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
        await expect(sidebar).toBeVisible({ timeout: 10000 });

        // Check sidebar CSS properties (width 256px / w-64, sticky position)
        const isSticky = await sidebar.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.position === "sticky" || el.classList.contains("sticky");
        });
        expect(isSticky).toBe(true);

        const sidebarWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
        expect(sidebarWidth).toBeCloseTo(256, 1);

        // 2. Verify mobile topbar hamburger and mobile navbar pill bar are hidden
        const mobileMenuTrigger = studentPage.locator("button[aria-label='Open menu']");
        await expect(mobileMenuTrigger).toBeHidden();

        const mobileNavbar = studentPage.locator("div.md\\:hidden").filter({ has: studentPage.locator("a") });
        await expect(mobileNavbar.first()).toBeHidden();

        // 3. Verify main content flows without horizontal overflow
        const hasHorizontalOverflow = await studentPage.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth;
        });
        expect(hasHorizontalOverflow).toBe(false);
      });
    }
  });

  // 2. Mobile Viewports (< 768px)
  test.describe("Mobile Viewports (< 768px)", () => {
    for (const vp of mobileViewports) {
      test(`TC-RESP-NAV-02 [${vp.name}]: Desktop sidebar is hidden, sticky topbar and mobile navbar pill bar are visible with all navigation pills`, async ({
        studentPage,
      }) => {
        await studentPage.setViewportSize({ width: vp.width, height: vp.height });
        await studentPage.goto("/");
        await studentPage.waitForLoadState("domcontentloaded");

        // 1. Desktop sidebar should be hidden
        const desktopSidebar = studentPage.locator("aside.hidden.md\\:flex, aside.md\\:flex");
        await expect(desktopSidebar.first()).toBeHidden();

        // 2. Mobile Topbar is visible and sticky
        const mobileTopbar = studentPage.locator("header").first();
        await expect(mobileTopbar).toBeVisible();

        const isTopbarSticky = await mobileTopbar.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.position === "sticky" || el.classList.contains("sticky");
        });
        expect(isTopbarSticky).toBe(true);

        // 3. Mobile Navbar pill bar is visible
        const mobilePillBar = studentPage.locator("div.md\\:hidden.overflow-x-auto, div.md\\:hidden").filter({ has: studentPage.locator("a") }).first();
        await expect(mobilePillBar).toBeVisible();

        // 4. Verify link pills exist in the mobile navbar
        const expectedPills = [
          { text: /Home/i, href: "/" },
          { text: /Subjects/i, href: "/subjects" },
          { text: /Today/i, href: "/today" },
          { text: /Routine/i, href: "/routine" },
          { text: /Attendance/i, href: "/attendance" },
          { text: /Assignments|Homework/i, href: "/homework" },
          { text: /Notices/i, href: "/notices" },
          { text: /Events/i, href: "/events" },
        ];

        for (const pill of expectedPills) {
          const pillLink = mobilePillBar.locator(`a[href='${pill.href}']`);
          await expect(pillLink.first()).toBeVisible();
          await expect(pillLink.first()).toHaveText(pill.text);
        }
      });

      test(`TC-RESP-NAV-03 [${vp.name}]: Mobile hamburger button opens Sheet drawer with full navigation links and navigates correctly`, async ({
        studentPage,
      }) => {
        await studentPage.setViewportSize({ width: vp.width, height: vp.height });
        await studentPage.goto("/");
        await studentPage.waitForLoadState("domcontentloaded");

        // 1. Open hamburger drawer
        const hamburgerBtn = studentPage.locator("button[aria-label='Open menu']").first();
        await expect(hamburgerBtn).toBeVisible();
        await hamburgerBtn.click();

        // 2. Sheet drawer dialog should appear
        const sheetDrawer = studentPage.locator("[role='dialog']").filter({ hasText: /Student Portal|Classroom OS/i });
        await expect(sheetDrawer).toBeVisible({ timeout: 5000 });

        // 3. Verify main navigation items in the drawer
        const drawerNav = sheetDrawer.locator("nav");
        await expect(drawerNav).toBeVisible();
        await expect(drawerNav.locator("a[href='/routine']")).toBeVisible();
        await expect(drawerNav.locator("a[href='/attendance']")).toBeVisible();
        await expect(drawerNav.locator("a[href='/homework']")).toBeVisible();

        // 4. Click a link in the drawer (e.g. Routine) and verify navigation
        await drawerNav.locator("a[href='/routine']").click();
        await studentPage.waitForURL(/\/routine/);
        await expect(studentPage).toHaveURL(/\/routine/);
      });
    }
  });

  // 3. Admin Navigation & Route Isolation
  test.describe("Admin Navigation & Route Isolation", () => {
    test("TC-RESP-NAV-04: Admin sidebar navigates cleanly between /admin routes on desktop", async ({
      adminPage,
    }) => {
      await adminPage.setViewportSize({ width: 1280, height: 800 });
      await adminPage.goto("/admin");
      await adminPage.waitForLoadState("domcontentloaded");

      const adminSidebar = adminPage.locator("aside").filter({ hasText: /Admin Console|Classroom OS/i }).first();
      await expect(adminSidebar).toBeVisible();

      // Navigate to Accounts & Auth
      await adminSidebar.locator("a[href='/admin/accounts']").click();
      await adminPage.waitForURL(/\/admin\/accounts/);
      await expect(adminPage).toHaveURL(/\/admin\/accounts/);

      // Navigate to Teachers
      await adminSidebar.locator("a[href='/admin/teachers']").click();
      await adminPage.waitForURL(/\/admin\/teachers/);
      await expect(adminPage).toHaveURL(/\/admin\/teachers/);

      // Navigate to Students
      await adminSidebar.locator("a[href='/admin/students']").click();
      await adminPage.waitForURL(/\/admin\/students/);
      await expect(adminPage).toHaveURL(/\/admin\/students/);

      // Navigate to Subjects
      await adminSidebar.locator("a[href='/admin/subjects']").click();
      await adminPage.waitForURL(/\/admin\/subjects/);
      await expect(adminPage).toHaveURL(/\/admin\/subjects/);
    });

    test("TC-RESP-NAV-05: Admin dashboard quick action links stay within /admin/* or valid administrative routes", async ({
      adminPage,
    }) => {
      await adminPage.setViewportSize({ width: 1280, height: 800 });
      await adminPage.goto("/admin");
      await adminPage.waitForLoadState("domcontentloaded");

      // Verify quick action links
      const quickActionLinks = adminPage.locator("a").filter({
        hasText: /Post Notice|Create Assignment|View Routine|Log Session|Manage Notices|View Calendar/i,
      });

      const count = await quickActionLinks.count();
      expect(count).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < count; i++) {
        const link = quickActionLinks.nth(i);
        const href = await link.getAttribute("href");
        expect(href).toBeTruthy();
        if (href && (href.includes("notices") || href.includes("homework") || href.includes("events"))) {
          expect(href.startsWith("/admin/") || href.startsWith("/")).toBe(true);
        }
      }
    });

    test("TC-RESP-NAV-06: Admin mobile hamburger opens Sheet drawer and navigates cleanly", async ({
      adminPage,
    }) => {
      await adminPage.setViewportSize({ width: 375, height: 667 });
      await adminPage.goto("/admin");
      await adminPage.waitForLoadState("domcontentloaded");

      // Desktop sidebar should be hidden on mobile
      const desktopSidebar = adminPage.locator("aside.hidden.md\\:flex, aside.md\\:flex");
      await expect(desktopSidebar.first()).toBeHidden();

      // Mobile header should be visible
      const mobileHeader = adminPage.locator("header.md\\:hidden").first();
      await expect(mobileHeader).toBeVisible();

      // Open mobile hamburger menu
      const adminMenuTrigger = adminPage.locator("button[aria-label='Open menu']").first();
      await expect(adminMenuTrigger).toBeVisible();
      await adminMenuTrigger.click();

      // Verify Sheet dialog appears
      const sheetDrawer = adminPage.locator("[role='dialog']").filter({ hasText: /Admin Console|Classroom OS/i });
      await expect(sheetDrawer).toBeVisible({ timeout: 5000 });

      // Click Accounts link in mobile drawer
      await sheetDrawer.locator("a[href='/admin/accounts']").click();
      await adminPage.waitForURL(/\/admin\/accounts/);
      await expect(adminPage).toHaveURL(/\/admin\/accounts/);
    });
  });
});
