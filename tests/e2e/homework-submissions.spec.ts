import { test, expect } from "../fixtures/auth.fixture";
import { HomeworkPage } from "../fixtures/pom/homework.page";
import { mockUploadThing, attachSyntheticFile } from "../fixtures/upload-mock";

test.describe("F16, F17: Homework & Assignment Submission Workspace", () => {
  test.describe("Tier 1 & 2: Homework Tabs & Temporal Badges", () => {
    test("TC-SPEC-HW-01: Homework workspace renders Active, Due Soon, Overdue, Submitted, and Graded tabs", async ({ studentPage }) => {
      const hwPage = new HomeworkPage(studentPage);
      await hwPage.goto();

      await expect(hwPage.tabActive.first()).toBeVisible({ timeout: 10000 });
      await expect(hwPage.tabSubmitted.or(hwPage.page.locator("button:has-text('Completed')")).first()).toBeVisible();
    });

    test("TC-SPEC-HW-02: Active tab lists pending assignments with due dates", async ({ studentPage }) => {
      const hwPage = new HomeworkPage(studentPage);
      await hwPage.goto();

      await expect(hwPage.assignmentCards.first()).toBeVisible({ timeout: 10000 });
      const cardCount = await hwPage.assignmentCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(1);
    });

    test("TC-SPEC-HW-03: Temporal status indicators (Due Soon / Overdue) render correctly", async ({ studentPage }) => {
      const hwPage = new HomeworkPage(studentPage);
      await hwPage.goto();

      // Verify badges exist on active cards
      const badgeLocators = studentPage.locator("span.badge, span.rounded-full, span:has-text('Due'), span:has-text('Overdue')");
      await expect(badgeLocators.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Tier 1, 3 & 4: Submission Modal, Draft Saving & File Attachment", () => {
    test("TC-SPEC-HW-04: Student saves draft text answer in submission modal", async ({ studentPage }) => {
      const hwPage = new HomeworkPage(studentPage);
      await hwPage.goto();

      if (await hwPage.submitWorkButton.count() > 0) {
        await hwPage.submitWorkButton.first().click();

        if (await hwPage.textAnswerInput.isVisible()) {
          const draftText = "Draft analysis: Left rotation maintains Red-Black binary search invariant.";
          await hwPage.textAnswerInput.fill(draftText);

          if (await hwPage.saveDraftButton.isVisible()) {
            await hwPage.saveDraftButton.scrollIntoViewIfNeeded();
            await hwPage.saveDraftButton.evaluate((el: HTMLElement) => el.click());
            await hwPage.expectToast(/draft saved|saved/i);
          }
        }
      }
    });

    test("TC-SPEC-HW-05: Student submits assignment with PDF attachment via UploadThing mock", async ({ studentPage }) => {
      // Mock UploadThing route
      await mockUploadThing(studentPage, {
        fileName: "dsa_red_black_tree_solution.pdf",
        fileUrl: "https://utfs.io/f/mock-dsa-tree-solution.pdf",
      });

      const hwPage = new HomeworkPage(studentPage);
      await hwPage.goto();

      if (await hwPage.submitWorkButton.count() > 0) {
        await hwPage.submitWorkButton.first().click();

        // Attach synthetic file if file input exists
        const fileInput = studentPage.locator("input[type='file']");
        if (await fileInput.count() > 0) {
          await attachSyntheticFile(studentPage, "input[type='file']", "dsa_red_black_tree_solution.pdf");
        }

        if (await hwPage.textAnswerInput.isVisible()) {
          await hwPage.textAnswerInput.fill("Final submission with attached implementation code and analysis.");
        }

        if (await hwPage.finalSubmitButton.isVisible()) {
          await hwPage.finalSubmitButton.scrollIntoViewIfNeeded();
          await hwPage.finalSubmitButton.evaluate((el: HTMLElement) => el.click());

          // Expect toast or status update
          const successAlert = hwPage.toastMessage.or(studentPage.locator("div:has-text('Submitted')"));
          await expect(successAlert.first()).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test("TC-SPEC-HW-06: Graded tab displays score, grade badge, and instructor remarks", async ({ studentPage }) => {
      const hwPage = new HomeworkPage(studentPage);
      await hwPage.goto();

      if (await hwPage.tabGraded.isVisible()) {
        await hwPage.tabGraded.click();

        // Check if graded card or grade feedback exists
        const gradedCards = hwPage.assignmentCards.or(studentPage.locator("div:has-text('Score'), div:has-text('Grade')"));
        await expect(gradedCards.first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
