import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomeworkPage extends BasePage {
  readonly tabActive: Locator;
  readonly tabDueSoon: Locator;
  readonly tabOverdue: Locator;
  readonly tabSubmitted: Locator;
  readonly tabGraded: Locator;
  readonly assignmentCards: Locator;
  readonly submitWorkButton: Locator;
  readonly textAnswerInput: Locator;
  readonly saveDraftButton: Locator;
  readonly finalSubmitButton: Locator;
  readonly gradeFeedbackCard: Locator;
  readonly uploadDropzone: Locator;

  constructor(page: Page) {
    super(page);
    this.tabActive = page.locator("button[role='tab'], button").filter({ hasText: /^Active/i });
    this.tabDueSoon = page.locator("button[role='tab'], button").filter({ hasText: /Due Soon/i });
    this.tabOverdue = page.locator("button[role='tab'], button").filter({ hasText: /Overdue/i });
    this.tabSubmitted = page.locator("button[role='tab'], button").filter({ hasText: /Submitted|Completed/i });
    this.tabGraded = page.locator("button[role='tab'], button").filter({ hasText: /Graded/i });
    this.assignmentCards = page.locator("[data-testid='assignment-card'], div.border.rounded-xl, div.rounded-lg");
    
    // Submission modal
    this.submitWorkButton = page.locator("button").filter({ hasText: /Submit Assignment|Submit Work|Turn In|Add Submission/i });
    this.textAnswerInput = page.locator("textarea[name='content'], textarea#content, textarea[placeholder*='solution']");
    this.saveDraftButton = page.locator("button").filter({ hasText: /Save Draft|Draft/i });
    this.finalSubmitButton = page.locator("button[type='submit']").filter({ hasText: /Turn In|Submit|Confirm/i });
    this.gradeFeedbackCard = page.locator("[data-testid='grade-feedback-card'], div").filter({ hasText: /Grade & Feedback|Score|Feedback/i });
    this.uploadDropzone = page.locator("[data-ut-element='dropzone'], [data-testid='file-upload-dropzone'], input[type='file']");
  }

  async goto() {
    await this.navigateTo("/homework");
  }

  async openAssignment(title: string) {
    await this.page.locator(`text=${title}`).first().click();
  }

  async submitAssignmentWithText(answerText: string) {
    if (await this.submitWorkButton.isVisible()) {
      await this.submitWorkButton.first().click();
    }
    await this.textAnswerInput.fill(answerText);
    await this.finalSubmitButton.first().click();
  }
}
