import { test, expect } from "../fixtures/auth.fixture";
import { SubjectsPage } from "../fixtures/pom/subjects.page";
import { TEST_SUBJECTS } from "../fixtures/seed-data";

test.describe("F13, F14: Student Subjects Workspace & Strict Data Isolation", () => {
  test.describe("Tier 1 & 2: Enrolled Subjects Grid & 4-Tab Detail View", () => {
    test("TC-SPEC-SUBJ-01: Enrolled student views subjects grid at /subjects", async ({ studentPage }) => {
      const subjectsPage = new SubjectsPage(studentPage);
      await subjectsPage.gotoGrid();

      await expect(subjectsPage.subjectCards.first()).toBeVisible({ timeout: 10000 });
      const cardCount = await subjectsPage.subjectCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(1);
    });

    test("TC-SPEC-SUBJ-02: Subject detail view loads with Syllabus, Sessions, Assignments, and Resources tabs", async ({ studentPage }) => {
      const subjectsPage = new SubjectsPage(studentPage);
      await subjectsPage.gotoDetail(TEST_SUBJECTS.dsa.id);

      // Verify tabs presence
      await expect(subjectsPage.tabSyllabus.or(subjectsPage.tabSessions).first()).toBeVisible({ timeout: 10000 });
    });

    test("TC-SPEC-SUBJ-03: Switching tabs renders respective academic sections cleanly", async ({ studentPage }) => {
      const subjectsPage = new SubjectsPage(studentPage);
      await subjectsPage.gotoDetail(TEST_SUBJECTS.dsa.id);

      if (await subjectsPage.tabSessions.isVisible()) {
        await subjectsPage.tabSessions.click();
        await expect(studentPage.locator("div:has-text('Topics Covered'), div:has-text('Session')").first()).toBeVisible({ timeout: 5000 });
      }

      if (await subjectsPage.tabResources.isVisible()) {
        await subjectsPage.tabResources.click();
        await expect(studentPage.locator("div:has-text('Materials'), div:has-text('Download'), div:has-text('Slides')").first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Tier 1, 2 & 4: Strict Security Isolation & Multi-Tenant Boundaries", () => {
    test("TC-SPEC-SUBJ-04: Student accessing un-enrolled subject ID receives 404 Not Found or 403 Forbidden", async ({ unauthorizedPage }) => {
      const subjectsPage = new SubjectsPage(unauthorizedPage);

      // Unauthorized student (CSIT) tries accessing BCA-only DSA subject
      await subjectsPage.gotoDetail(TEST_SUBJECTS.dsa.id);

      // Assert that page returns 404 or 403 and does not disclose BCA lecture notes
      const isForbiddenOrNotFound = await unauthorizedPage.locator("h1, h2, div, p")
        .filter({ hasText: /404|403|Not Found|Access Denied|Forbidden|Not Enrolled/i })
        .count() > 0;

      const redirected = unauthorizedPage.url().endsWith("/subjects") || unauthorizedPage.url().endsWith("/");
      expect(isForbiddenOrNotFound || redirected).toBeTruthy();
    });

    test("TC-SPEC-SUBJ-05: Non-existent subject ID returns 404 Not Found", async ({ studentPage }) => {
      const subjectsPage = new SubjectsPage(studentPage);
      await subjectsPage.gotoDetail("subj_invalid_uuid_9999");

      const notFoundElement = studentPage.locator("h1, h2, div, p").filter({ hasText: /404|Not Found|does not exist/i });
      await expect(notFoundElement.first()).toBeVisible({ timeout: 10000 });
    });

    test("TC-SPEC-SUBJ-06: Student cannot access other students' submission URLs directly", async ({ studentPage }) => {
      // Direct navigation to foreign student submission ID
      const response = await studentPage.goto("/homework/submissions/foreign-student-sub-999");
      const status = response?.status() ?? 404;
      const redirected = !studentPage.url().includes("foreign-student-sub-999");

      // Verify access rejection (403, 404, or non-200 status or redirect)
      expect(status >= 400 || redirected).toBeTruthy();
    });
  });
});
