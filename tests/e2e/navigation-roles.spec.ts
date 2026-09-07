import { test, expect } from "../fixtures/auth.fixture";

/**
 * Navigation IA — role-aware AppShell (spec §3, §9)
 *
 * Asserts the FINAL information architecture:
 * - Typed nav trees per role (sections, items) rendered by the shared AppShell
 * - Role chrome follows the session user (teacher on shared /today → teacher nav)
 * - No per-subject links inside global navigation (subject workspace is Level 2)
 * - Active state via segment-boundary matcher (My Subjects activates on /subjects/<slug>)
 * - Mobile: fixed bottom tab bar + "More" sheet instead of the legacy pill strip
 */

const SEEDED_SLUG_DBMS = "database-management-systems";

test.describe("Navigation IA: role-aware shells", () => {
  test.describe("STUDENT", () => {
    test("TC-NAV-ROLE-01: desktop sidebar shows Home/Today top block then ACADEMICS/CLASS/CAMPUS sections", async ({
      studentPage,
    }) => {
      await studentPage.setViewportSize({ width: 1280, height: 800 });
      await studentPage.goto("/");
      await studentPage.waitForLoadState("domcontentloaded");

      const sidebar = studentPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });
      await expect(sidebar.getByText("Student Portal")).toBeVisible();

      // Top block (untitled): Home · Today
      await expect(sidebar.locator("a[href='/']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/today']").first()).toBeVisible();

      // Section headings exactly per spec §3.1 (rendered uppercase via CSS)
      await expect(sidebar.getByText("ACADEMICS")).toBeVisible();
      await expect(sidebar.getByText(/^class$/i)).toBeVisible();
      await expect(sidebar.getByText("CAMPUS")).toBeVisible();

      // Academics: My Subjects · Assignments · Attendance
      await expect(sidebar.locator("a[href='/subjects']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/homework']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/attendance']").first()).toBeVisible();

      // Class: Routine · Session Logs
      await expect(sidebar.locator("a[href='/routine']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/lecture-logs']").first()).toBeVisible();

      // Campus: Notices · Events
      await expect(sidebar.locator("a[href='/notices']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/events']").first()).toBeVisible();

      // Legacy label must be gone (top item is now "Home", not "Dashboard")
      await expect(sidebar.getByText("Dashboard")).toHaveCount(0);
    });

    test("TC-NAV-ROLE-02: global nav contains NO per-subject links (subject workspace is Level 2)", async ({
      studentPage,
    }) => {
      await studentPage.setViewportSize({ width: 1280, height: 800 });
      await studentPage.goto("/");
      await studentPage.waitForLoadState("domcontentloaded");

      const sidebar = studentPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });

      // The old SubjectsDropdown expanded into one link per subject — forbidden now.
      const perSubjectLinks = sidebar.locator("a[href^='/subjects/']");
      await expect(perSubjectLinks).toHaveCount(0);
    });

    test("TC-NAV-ROLE-03: visiting /subjects/<seeded-slug> activates the 'My Subjects' nav item", async ({
      studentPage,
    }) => {
      await studentPage.setViewportSize({ width: 1280, height: 800 });
      await studentPage.goto(`/subjects/${SEEDED_SLUG_DBMS}`);
      await studentPage.waitForLoadState("domcontentloaded");

      const sidebar = studentPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      const mySubjectsLink = sidebar.locator("a[href='/subjects']").first();
      await expect(mySubjectsLink).toBeVisible({ timeout: 10000 });

      // Active styling contract: bg-primary pill (segment-boundary match /subjects/<slug>)
      await expect(mySubjectsLink).toHaveClass(/bg-primary/);
    });
  });

  test.describe("TEACHER", () => {
    test("TC-NAV-ROLE-04: teacher visiting shared /today sees Teacher portal chrome and NO student-only items", async ({
      teacherPage,
    }) => {
      await teacherPage.setViewportSize({ width: 1280, height: 800 });
      await teacherPage.goto("/today");
      await teacherPage.waitForLoadState("domcontentloaded");

      const sidebar = teacherPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });

      // Teacher chrome, not student chrome (brand subtitle + footer card both
      // say "Teacher Portal" — target the brand one)
      await expect(sidebar.getByText("Teacher Portal").first()).toBeVisible();
      await expect(sidebar.getByText("Student Portal")).toHaveCount(0);

      // TEACHING section incl. Attendance with pending disputes
      await expect(sidebar.getByText("TEACHING")).toBeVisible();
      await expect(sidebar.getByText("WORK")).toBeVisible();
      await expect(sidebar.locator("a[href='/today']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/teacher/subjects']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/teacher/attendance']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/teacher/lecture-logs']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/teacher/resources']").first()).toBeVisible();

      // Student-only destinations must not leak into teacher navigation
      await expect(sidebar.locator("a[href='/homework']").first()).toHaveCount(0);
      await expect(sidebar.locator("a[href='/routine']").first()).toHaveCount(0);
      await expect(sidebar.locator("a[href='/notices']").first()).toHaveCount(0);
      await expect(sidebar.locator("a[href='/events']").first()).toHaveCount(0);
    });

    test("TC-NAV-ROLE-05: Attendance nav item renders in teacher navigation", async ({
      teacherPage,
    }) => {
      await teacherPage.setViewportSize({ width: 1280, height: 800 });
      await teacherPage.goto("/teacher");
      await teacherPage.waitForLoadState("domcontentloaded");

      const sidebar = teacherPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      const attendanceLink = sidebar.locator("a[href='/teacher/attendance']").first();
      await expect(attendanceLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("ADMIN", () => {
    test("TC-NAV-ROLE-06: admin sidebar shows People/Academics/Campus/System groups incl. orphan-fixed Attendance Reviews, and never student items", async ({
      adminPage,
    }) => {
      await adminPage.setViewportSize({ width: 1280, height: 800 });
      await adminPage.goto("/admin");
      await adminPage.waitForLoadState("domcontentloaded");

      const sidebar = adminPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });

      // Top block + grouped sections per spec §3.4
      await expect(sidebar.locator("a[href='/admin']").first()).toBeVisible();
      await expect(sidebar.getByText("PEOPLE")).toBeVisible();
      await expect(sidebar.getByText("ACADEMICS")).toBeVisible();
      await expect(sidebar.getByText("CAMPUS")).toBeVisible();
      await expect(sidebar.getByText("SYSTEM")).toBeVisible();

      await expect(sidebar.locator("a[href='/admin/students']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/admin/teachers']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/admin/accounts']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/admin/subjects']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/admin/homework']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/admin/notices']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/admin/events']").first()).toBeVisible();
      // Previously-orphaned page now reachable from SYSTEM group
      await expect(sidebar.locator("a[href='/admin/attendance']").first()).toBeVisible();

      // Student-only destinations must never appear in admin chrome
      await expect(sidebar.locator("a[href='/homework']").first()).toHaveCount(0);
      await expect(sidebar.locator("a[href='/routine']").first()).toHaveCount(0);
      await expect(sidebar.locator("a[href='/attendance']").first()).toHaveCount(0);
      await expect(sidebar.locator("a[href='/lecture-logs']").first()).toHaveCount(0);
      await expect(sidebar.getByText("Student Portal")).toHaveCount(0);
    });
  });

  test.describe("CR", () => {
    test("TC-NAV-ROLE-07: CR sidebar surfaces the Log Session item alongside class-management tools", async ({
      crPage,
    }) => {
      await crPage.setViewportSize({ width: 1280, height: 800 });
      await crPage.goto("/cr");
      await crPage.waitForLoadState("domcontentloaded");

      const sidebar = crPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
      await expect(sidebar).toBeVisible({ timeout: 10000 });

      await expect(sidebar.locator("a[href='/cr/log-session']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/attendance']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/lecture-logs']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/subjects']").first()).toBeVisible();
      await expect(sidebar.locator("a[href='/routine']").first()).toBeVisible();
    });
  });

  test.describe("MOBILE (<768px)", () => {
    test("TC-NAV-ROLE-08: fixed bottom tab bar shows Home/Today/Subjects/More with no horizontal overflow", async ({
      studentPage,
    }) => {
      await studentPage.setViewportSize({ width: 375, height: 667 });
      await studentPage.goto("/");
      await studentPage.waitForLoadState("domcontentloaded");

      const bottomNav = studentPage.locator("[data-testid='mobile-bottom-nav']");
      await expect(bottomNav).toBeVisible({ timeout: 10000 });
      await expect(bottomNav.locator("a[href='/']").first()).toBeVisible();
      await expect(bottomNav.locator("a[href='/today']").first()).toBeVisible();
      await expect(bottomNav.locator("a[href='/subjects']").first()).toBeVisible();
      await expect(bottomNav.locator("button[aria-label='More navigation']")).toBeVisible();

      // Content must never require horizontal scrolling
      const hasHorizontalOverflow = await studentPage.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    });

    test("TC-NAV-ROLE-09: 'More' opens a sheet listing the remaining role items (Assignments, Notices, Sign Out)", async ({
      studentPage,
    }) => {
      await studentPage.setViewportSize({ width: 375, height: 667 });
      await studentPage.goto("/");
      await studentPage.waitForLoadState("domcontentloaded");

      await studentPage.locator("button[aria-label='More navigation']").click();

      const moreSheet = studentPage.locator("[role='dialog']").filter({ hasText: /Assignments/i });
      await expect(moreSheet).toBeVisible({ timeout: 5000 });
      await expect(moreSheet.locator("a[href='/homework']").first()).toBeVisible();
      await expect(moreSheet.locator("a[href='/attendance']").first()).toBeVisible();
      await expect(moreSheet.locator("a[href='/notices']").first()).toBeVisible();
      await expect(moreSheet.getByRole("button", { name: /Sign Out/i })).toBeVisible();
    });
  });
});
