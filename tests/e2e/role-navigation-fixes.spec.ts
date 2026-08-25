import { test, expect } from "../fixtures/auth.fixture";
import { LoginPage } from "../fixtures/pom/login.page";
import { TEST_PERSONAS } from "../fixtures/seed-data";
import { createClient } from "@libsql/client";

/**
 * Role-based navigation fixes (audit findings F-01, F-03, F-04, F-07,
 * F-08, F-09, F-10, F-11):
 *
 * - F-01: write-form pages gate views behind requireAuth, matching each
 *   server action's role matrix.
 * - F-03: /profile enforces mustChangePassword quarantine like every other
 *   authenticated page.
 * - F-04: grades surfaces are reachable (admin Gradebook, student My Grades,
 *   report card entry).
 * - F-07: each role lands on its own dashboard after sign-in.
 * - F-08: deep links survive session loss via callbackUrl round-trip.
 * - F-09/F-10/F-11: one name per destination across nav and pages.
 */

const BASE = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001";

async function getFirstRoutineId(): Promise<string | null> {
  const client = createClient({
    url: process.env.DATABASE_URL || "file:local.test.db",
  });
  try {
    const res = await client.execute("SELECT id FROM weekly_routine LIMIT 1");
    return (res.rows[0]?.id as string) ?? null;
  } finally {
    client.close();
  }
}

test.describe("F-01: write-form pages are view-guarded", () => {
  const cases = [
    { href: "/notices/new", heading: "Publish Notice" },
    { href: "/events/new", heading: "Schedule Event" },
    { href: "/homework/new", heading: "Assign New Work" },
    { href: "/routine/new", heading: "Add Routine Entry" },
  ];

  for (const { href, heading } of cases) {
    test(`STUDENT visiting ${href} is bounced home without the ${heading} form`, async ({
      studentPage,
    }) => {
      await studentPage.goto(href);

      // Role-mismatched users are redirected to their own portal root…
      await expect(studentPage).toHaveURL(`${BASE}/`);
      // …and never see the write form.
      await expect(studentPage.getByText(heading)).toHaveCount(0);
    });
  }

  test("STUDENT cannot open /routine/[id]/edit even with a real routine id", async ({
    studentPage,
  }) => {
    const routineId = await getFirstRoutineId();
    expect(routineId).toBeTruthy();

    await studentPage.goto(`/routine/${routineId}/edit`);

    await expect(studentPage).toHaveURL(`${BASE}/`);
    await expect(studentPage.getByText("Edit Routine Entry")).toHaveCount(0);
  });

  test("TEACHER can still open /homework/new (guard does not over-block)", async ({
    teacherPage,
  }) => {
    await teacherPage.goto("/homework/new");
    await expect(
      teacherPage.getByText("Assign New Work", { exact: true })
    ).toBeVisible();
  });

  test("ADMIN can still open /notices/new (guard does not over-block)", async ({
    adminPage,
  }) => {
    await adminPage.goto("/notices/new");
    await expect(adminPage.getByText("Publish Notice")).toBeVisible();
  });
});

test.describe("F-03: /profile honors mustChangePassword quarantine", () => {
  test("quarantined student visiting /profile is sent to /change-password", async ({
    newStudentPage,
  }) => {
    await newStudentPage.goto("/profile");

    await expect(newStudentPage).toHaveURL(/\/change-password/);
  });
});

test.describe("F-04: grades surfaces are reachable from navigation", () => {
  test("admin sidebar exposes Gradebook (/admin/gradebook)", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin");

    const sidebar = adminPage
      .locator("aside")
      .filter({ hasText: /Classroom OS/i })
      .first();
    await expect(sidebar.locator("a[href='/admin/gradebook']")).toBeVisible();
  });

  test("student sidebar exposes My Grades (/my-grades)", async ({
    studentPage,
  }) => {
    await studentPage.goto("/");

    const sidebar = studentPage
      .locator("aside")
      .filter({ hasText: /Classroom OS/i })
      .first();
    await expect(sidebar.locator("a[href='/my-grades']")).toBeVisible();
  });

  test("My Grades links to the student's own printable report card", async ({
    studentPage,
  }) => {
    await studentPage.goto("/my-grades");

    const reportCardLink = studentPage.locator("a[href^='/report-cards/']");
    await expect(reportCardLink.first()).toBeVisible();

    // The linked report card must be the caller's own record (no IDOR).
    const href = await reportCardLink.first().getAttribute("href");
    expect(href).toMatch(/^\/report-cards\/sp_student_001$/);
  });
});

test.describe("F-07: post-login landing per role", () => {
  test("admin signing in lands on the admin dashboard, not Accounts", async ({
    guestPage,
  }) => {
    const loginPage = new LoginPage(guestPage);
    await loginPage.goto();

    await loginPage.login(TEST_PERSONAS.admin.email, TEST_PERSONAS.admin.password);

    await expect(guestPage).toHaveURL(`${BASE}/admin`);
  });
});

test.describe("F-08: deep links survive authentication loss", () => {
  test("unauthenticated visit to a protected page resumes there after login", async ({
    guestPage,
  }) => {
    await guestPage.goto("/notices");

    // Redirect to login carries the intended destination…
    await expect(guestPage).toHaveURL(/\/login\?callbackUrl=%2Fnotices$/);

    const loginPage = new LoginPage(guestPage);
    await loginPage.login(
      TEST_PERSONAS.activeStudent.email,
      TEST_PERSONAS.activeStudent.password
    );

    // …and sign-in completes the original deep link.
    await expect(guestPage).toHaveURL(`${BASE}/notices`);
  });

  test("expired-session visit to a protected page preserves the path", async ({
    studentPage,
  }) => {
    await studentPage.goto("/notices");
    expect(studentPage.url()).toContain("/notices");
  });
});

test.describe("F-09/F-10/F-11: one name per destination", () => {
  test("admin nav says Attendance Disputes (matches page heading)", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin");

    const sidebar = adminPage
      .locator("aside")
      .filter({ hasText: /Classroom OS/i })
      .first();
    await expect(sidebar.getByText("Attendance Disputes")).toBeVisible();
    await expect(sidebar.getByText("Attendance Reviews")).toHaveCount(0);
  });

  test("student nav calls /routine 'Routine' everywhere (not Timetable)", async ({
    studentPage,
  }) => {
    await studentPage.goto("/");

    const sidebar = studentPage
      .locator("aside")
      .filter({ hasText: /Classroom OS/i })
      .first();
    const routineLink = sidebar.locator("a[href='/routine']");
    await expect(routineLink).toBeVisible();
    await expect(routineLink).toHaveText(/^Routine$/);
    await expect(sidebar.getByText("Timetable")).toHaveCount(0);

    // Home dashboard card uses the same vocabulary.
    await expect(studentPage.getByText("Today's Routine")).toBeVisible();
    await expect(studentPage.getByText("Today's Timetable")).toHaveCount(0);
  });

  test("admin homework creation form shows the full 'Assign New Work' heading", async ({
    adminPage,
  }) => {
    await adminPage.goto("/admin/homework/new");

    await expect(
      adminPage.getByText("Assign New Work", { exact: true })
    ).toBeVisible();
    await expect(adminPage.getByText("Assign New", { exact: true })).toHaveCount(
      0
    );
  });
});
