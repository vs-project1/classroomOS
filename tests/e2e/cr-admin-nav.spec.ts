import { test, expect } from "../fixtures/auth.fixture";

/**
 * CR dashboard prominence + admin navigation completion (spec Tasks 5)
 *
 * CR: a Today-summary strip (X classes / Y logged / Z remaining) with the
 * three primary actions. Admin: full People→Academics→Campus→System traversal
 * including the previously-orphaned /admin/attendance.
 */
test.describe("CR dashboard & admin nav", () => {
  test("TC-CRADMIN-01: CR dashboard strip shows consistent today counts", async ({
    crPage,
  }) => {
    await crPage.setViewportSize({ width: 1280, height: 800 });
    await crPage.goto("/cr");
    await crPage.waitForLoadState("domcontentloaded");

    const strip = crPage.getByTestId("cr-today-strip");
    await expect(strip).toBeVisible({ timeout: 10000 });

    const classesText = await strip.getByTestId("cr-classes-today").textContent();
    const loggedText = await strip.getByTestId("cr-logged-today").textContent();
    const remainingText = await strip.getByTestId("cr-remaining").textContent();

    const classes = Number(classesText?.match(/\d+/)?.[0]);
    const logged = Number(loggedText?.match(/\d+/)?.[0]);
    const remaining = Number(remainingText?.match(/\d+/)?.[0]);

    expect(Number.isFinite(classes)).toBe(true);
    expect(Number.isFinite(logged)).toBe(true);
    expect(classes).toBeGreaterThan(0); // Saturday seed guarantees 2 routine rows
    expect(logged).toBeLessThanOrEqual(classes);
    expect(remaining).toBe(Math.max(classes - logged, 0));
  });

  test("TC-CRADMIN-02: primary CR actions are one click away", async ({ crPage }) => {
    await crPage.setViewportSize({ width: 1280, height: 800 });
    await crPage.goto("/cr");
    await crPage.waitForLoadState("domcontentloaded");

    const strip = crPage.getByTestId("cr-today-strip");
    await expect(strip.locator("a[href='/cr/log-session']").first()).toBeVisible();
    await expect(strip.locator("a[href='/attendance']").first()).toBeVisible();
    await expect(strip.locator("a[href='/lecture-logs']").first()).toBeVisible();
  });

  test("TC-CRADMIN-03: admin sidebar traverses People → Academics → Campus → System", async ({
    adminPage,
  }) => {
    test.setTimeout(120_000); // dev-mode cold compiles make first hops slow

    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.goto("/admin");
    await adminPage.waitForLoadState("domcontentloaded");

    const sidebar = adminPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();

    const route: Array<[string, RegExp]> = [
      ["/admin/students", /\/admin\/students/],
      ["/admin/teachers", /\/admin\/teachers/],
      ["/admin/accounts", /\/admin\/accounts/],
      ["/admin/subjects", /\/admin\/subjects/],
      ["/admin/homework", /\/admin\/homework/],
      ["/admin/notices", /\/admin\/notices/],
    ];

    for (const [href, urlPattern] of route) {
      // Health gate: the shell must be alive before each hop (a bare 404
      // boundary has no aside — surface that as this test's failure, not a
      // locator timeout on the next step).
      await expect(sidebar).toBeVisible({ timeout: 30_000 });
      await sidebar.locator(`a[href='${href}']`).first().click();
      await adminPage.waitForURL(urlPattern);
      await expect(adminPage).toHaveURL(urlPattern);
    }
  });

  test("TC-CRADMIN-04: admin Attendance Reviews page reachable (previously orphaned)", async ({
    adminPage,
  }) => {
    test.setTimeout(90_000);
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.goto("/admin/attendance");
    await expect(adminPage).toHaveURL(/\/admin\/attendance/, { timeout: 15000 });
    // Rendered page, not a not-found boundary: shell chrome present
    await expect(
      adminPage.locator("aside").filter({ hasText: /Classroom OS/i }).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
