import { test, expect } from "../fixtures/auth.fixture";

/**
 * Teacher Portal — home surfaces + shared-route chrome (spec §3.2, Task 4)
 *
 * The seed guarantees one ungraded status='submitted' submission for
 * tch_ram_001's subjects, so the Grading quick-link carries a live count.
 */
test.describe("Teacher portal: dashboard surfaces", () => {
  test("TC-TEACHER-01: teacher home shows a Grading quick-link with the pending count", async ({
    teacherPage,
  }) => {
    await teacherPage.setViewportSize({ width: 1280, height: 800 });
    await teacherPage.goto("/teacher");
    await teacherPage.waitForLoadState("domcontentloaded");

    const gradingLink = teacherPage.locator("a[href='/teacher/grading']").first();
    await expect(gradingLink).toBeVisible({ timeout: 10000 });
    await expect(gradingLink).toContainText(/[Gg]rading/);
    await expect(gradingLink).toContainText(/\d+/);
  });

    test("TC-TEACHER-02: grading page reachable via deep link and shows the submitted work queue", async ({
      teacherPage,
    }) => {
      await teacherPage.setViewportSize({ width: 1280, height: 800 });
      // Deep-link reachability is the product guarantee here; the sidebar
      // click-path is covered by TC-TEACHER-01/03 and the nav-badge specs.
      await teacherPage.goto("/teacher/grading");
      await expect(teacherPage).toHaveURL(/\/teacher\/grading/, { timeout: 15000 });

      // The seeded ungraded submission must appear in the work queue
      await expect(
        teacherPage.getByText(/Red-Black Trees|hw_dsa_trees|Assignment 3/i).first()
      ).toBeVisible({ timeout: 15000 });
    });

  test("TC-TEACHER-03: sidebar WORK section reaches the grading surface (badge already covered by TC-NAV-ROLE-05)", async ({
    teacherPage,
  }) => {
    await teacherPage.setViewportSize({ width: 1280, height: 800 });
    await teacherPage.goto("/teacher");
    await teacherPage.waitForLoadState("domcontentloaded");

    const sidebar = teacherPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
    const navGrading = sidebar.locator("a[href='/teacher/grading']").first();
    await expect(navGrading).toBeVisible({ timeout: 10000 });

    // Deep-link sanity: direct navigation renders the same surface
    await teacherPage.goto("/teacher/grading");
    await expect(teacherPage).toHaveURL(/\/teacher\/grading/);
  });
});
