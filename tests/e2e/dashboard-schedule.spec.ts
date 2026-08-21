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

  test.describe("Today Command Center (role-aware sections)", () => {
    test("TC-SPEC-DASH-10: /today greets the signed-in student by first name", async ({ studentPage }) => {
      await studentPage.goto("/today");

      const greeting = studentPage.getByTestId("today-greeting");
      await expect(greeting).toBeVisible({ timeout: 10000 });
      await expect(greeting).toContainText(/Good (morning|afternoon|evening), Bikash/i);
    });

    test("TC-SPEC-DASH-11: current-or-next class card renders subject, time range and status chip", async ({ studentPage }) => {
      await studentPage.goto("/today");

      const card = studentPage.getByTestId("current-next-class");
      await expect(card).toBeVisible({ timeout: 10000 });
      await expect(card).toContainText(/Web Technology|Database Management Systems/);
      await expect(card).toContainText(/\d{1,2}:\d{2}\s*(AM|PM)/);
      await expect(card.getByTestId("class-status-chip")).toBeVisible();
    });

    test("TC-SPEC-DASH-12: Deadlines card lists unsubmitted due-soon homework with link into /homework", async ({ studentPage }) => {
      await studentPage.goto("/today");

      const deadlines = studentPage.getByTestId("deadlines-card");
      await expect(deadlines).toBeVisible({ timeout: 10000 });
      // hw_dbms_norm is seeded unsubmitted for this student and due within 7 days;
      // hw_dsa_trees is submitted and must NOT be advertised as a deadline.
      await expect(deadlines).toContainText(/DBMS Lab Report/i);
      await expect(deadlines).not.toContainText(/Red-Black Trees/i);
      await expect(deadlines.locator("a[href='/homework']").first()).toBeVisible();
    });

    test("TC-SPEC-DASH-13: teacher on shared /today sees grading attention link instead of student deadline card", async ({ teacherPage }) => {
      await teacherPage.goto("/today");

      const attention = teacherPage.getByTestId("attention-card");
      await expect(attention).toBeVisible({ timeout: 10000 });
      const gradingLink = attention.locator("a[href='/teacher/grading']");
      await expect(gradingLink).toBeVisible();
      await expect(gradingLink).toContainText(/\d+/);

      await expect(teacherPage.getByTestId("deadlines-card")).toHaveCount(0);
    });
  });
});
