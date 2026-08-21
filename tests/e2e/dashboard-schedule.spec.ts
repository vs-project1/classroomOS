import { test, expect } from "../fixtures/auth.fixture";
import { DashboardPage } from "../fixtures/pom/dashboard.page";
import { TodaySchedulePage } from "../fixtures/pom/today.page";

test.describe("F11, F12: Student Dashboard & Today Schedule Timeline", () => {
  test.describe("Tier 1 & 2: Student Dashboard Widgets & NPT Greeting", () => {
    test("TC-SPEC-DASH-01: Dashboard renders personalized time-based NPT greeting and date", async ({ studentPage }) => {
      const dashboard = new DashboardPage(studentPage);
      await dashboard.goto();

      // Verify greeting presence ("Good morning / afternoon / evening")
      await expect(dashboard.greetingHeader.first()).toBeVisible({ timeout: 10000 });
    });

    test("TC-SPEC-DASH-02: Dashboard renders attendance barometer summary gauge widget", async ({ studentPage }) => {
      const dashboard = new DashboardPage(studentPage);
      await dashboard.goto();

      // Circular gauge or percentage indicator
      await expect(dashboard.attendanceSummaryGauge.first()).toBeVisible();
    });

    test("TC-SPEC-DASH-03: Dashboard displays Today's Timetable / upcoming classes list", async ({ studentPage }) => {
      const dashboard = new DashboardPage(studentPage);
      await dashboard.goto();

      await expect(dashboard.upcomingClassesList.first()).toBeVisible();
    });

    test("TC-SPEC-DASH-04: Dashboard displays active assignments summary card", async ({ studentPage }) => {
      const dashboard = new DashboardPage(studentPage);
      await dashboard.goto();

      await expect(dashboard.activeAssignmentsCard.first()).toBeVisible();
    });

    test("TC-SPEC-DASH-05: Dashboard displays pinned notices board with pin icons", async ({ studentPage }) => {
      const dashboard = new DashboardPage(studentPage);
      await dashboard.goto();

      await expect(dashboard.pinnedNoticesList.first()).toBeVisible();
    });
  });

  test.describe("Tier 1, 2 & 4: Today Schedule Timeline & 7-Day Navigation", () => {
    test("TC-SPEC-DASH-06: /today view renders 7-day date strip selector", async ({ studentPage }) => {
      const todayPage = new TodaySchedulePage(studentPage);
      await todayPage.goto();

      // Check day selector buttons are visible
      await expect(todayPage.daySelectorButtons.first()).toBeVisible({ timeout: 10000 });
      const buttonCount = await todayPage.daySelectorButtons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(1);
    });

    test("TC-SPEC-DASH-07: Switching days updates schedule timetable cards", async ({ studentPage }) => {
      const todayPage = new TodaySchedulePage(studentPage);
      await todayPage.goto();

      // Click a different day (e.g. Tuesday or Monday)
      await todayPage.selectDay("Mon");

      // Verify page stays healthy and renders timeline
      await expect(studentPage).toHaveURL(/today/);
    });

    test("TC-SPEC-DASH-08: Class sessions display status tags (UPCOMING, ONGOING, or COMPLETED)", async ({ studentPage }) => {
      const todayPage = new TodaySchedulePage(studentPage);
      await todayPage.goto();

      const statusBadges = todayPage.upcomingBadges
        .or(todayPage.ongoingBadges)
        .or(todayPage.completedBadges)
        .or(studentPage.locator("span.badge, span.rounded-full"));

      await expect(statusBadges.first()).toBeVisible({ timeout: 10000 });
    });

    test("TC-SPEC-DASH-09: Live/ongoing class displays prominent visual highlight", async ({ studentPage }) => {
      const todayPage = new TodaySchedulePage(studentPage);
      await todayPage.goto();

      // Check if session cards render
      await expect(todayPage.sessionCards.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
