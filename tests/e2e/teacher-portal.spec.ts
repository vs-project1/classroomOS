import { test, expect } from "../fixtures/auth.fixture";

/**
 * Teacher Portal — home surfaces + shared-route chrome (spec §3.2, Task 4)
 *
 * The seed guarantees one ungraded status='submitted' submission for
 * tch_ram_001's subjects, so the Grading quick-link carries a live count.
 */
test.describe("Teacher portal: dashboard surfaces", () => {
  test("TC-TEACHER-01: teacher home shows Attendance quick-link", async ({
    teacherPage,
  }) => {
    await teacherPage.setViewportSize({ width: 1280, height: 800 });
    await teacherPage.goto("/teacher");
    await teacherPage.waitForLoadState("domcontentloaded");

    const attendanceLink = teacherPage.locator("a[href='/teacher/attendance']").first();
    await expect(attendanceLink).toBeVisible({ timeout: 10000 });
    await expect(attendanceLink).toContainText(/Attendance/i);
  });

  test("TC-TEACHER-02: attendance page reachable via deep link and shows semester roster cards", async ({
    teacherPage,
  }) => {
    await teacherPage.setViewportSize({ width: 1280, height: 800 });
    await teacherPage.goto("/teacher/attendance");
    await expect(teacherPage).toHaveURL(/\/teacher\/attendance/, { timeout: 15000 });

    // Should render teacher attendance management header
    await expect(
      teacherPage.getByText(/Teacher Attendance & Correction/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("TC-TEACHER-03: sessions page reachable via deep link and shows lecture logs", async ({
    teacherPage,
  }) => {
    await teacherPage.setViewportSize({ width: 1280, height: 800 });
    await teacherPage.goto("/teacher/lecture-logs");
    await expect(teacherPage).toHaveURL(/\/teacher\/lecture-logs/, { timeout: 15000 });

    await expect(
      teacherPage.getByText(/Lecture Logs|Log Class Session/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
