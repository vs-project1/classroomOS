import { type Page, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class AttendancePage extends BasePage {
  readonly overallPercentageText: Locator;
  readonly safetyBufferText: Locator;
  readonly statusChip: Locator;
  readonly subjectTableRows: Locator;
  readonly whatIfSlider: Locator;
  readonly whatIfProjectedPercentage: Locator;
  readonly reportDisputeButton: Locator;
  readonly disputeReasonInput: Locator;
  readonly disputeStatusSelect: Locator;
  readonly submitDisputeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.overallPercentageText = page.locator("span.tabular-nums, [data-testid='overall-percentage'], div").filter({ hasText: /%/i });
    this.safetyBufferText = page.locator("p, div, span").filter({ hasText: /Safety Buffer|missable|recover/i });
    this.statusChip = page.locator("span, div").filter({ hasText: /SAFE|CAUTION|DANGER|At Risk|Good Standing/i });
    this.subjectTableRows = page.locator("table tbody tr");
    
    // What-If Calculator Locators
    this.whatIfSlider = page.locator("input[type='range'], [data-testid='what-if-slider']");
    this.whatIfProjectedPercentage = page.locator("[data-testid='what-if-projected-result'], span").filter({ hasText: /%/i });

    // Correction Modal
    this.reportDisputeButton = page.locator("button").filter({ hasText: /Report Incorrect Attendance|Request Correction|Report Issue|Dispute/i });
    this.disputeReasonInput = page.locator("textarea[name='reason'], textarea#reason");
    this.disputeStatusSelect = page.locator("select[name='requestedStatus'], select#requestedStatus");
    this.submitDisputeButton = page.locator("button[type='submit']").filter({ hasText: /Submit Request|Submit|Save/i });
  }

  async goto() {
    await this.navigateTo("/attendance");
  }

  async submitCorrectionRequest(reason: string, requestedStatus: "present" | "excused" = "present") {
    await this.reportDisputeButton.first().click();
    await this.disputeReasonInput.fill(reason);
    if (await this.disputeStatusSelect.isVisible()) {
      await this.disputeStatusSelect.selectOption(requestedStatus);
    }
    await this.submitDisputeButton.click();
  }
}
