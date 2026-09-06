import { type Page, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class TodaySchedulePage extends BasePage {
  readonly daySelectorButtons: Locator;
  readonly sessionCards: Locator;
  readonly upcomingBadges: Locator;
  readonly ongoingBadges: Locator;
  readonly completedBadges: Locator;
  readonly statusChips: Locator;

  constructor(page: Page) {
    super(page);
    this.daySelectorButtons = page.locator("[data-testid='day-strip-btn'], button").filter({ hasText: /Sun|Mon|Tue|Wed|Thu|Fri|Sat/i });
    this.sessionCards = page.locator("[data-testid='timeline-session-card']");
    // Real chip markup (src/app/(student)/today/page.tsx): each timeline card
    // renders exactly one <span> whose text is UPCOMING, ONGOING or COMPLETED.
    // Scoped to the card + anchored to exact uppercase text so unrelated
    // rounded-full spans (subject codes, deadline pills, "Today" pulse dot)
    // can never satisfy these locators.
    this.upcomingBadges = page.locator("[data-testid='timeline-session-card'] span").filter({ hasText: /^\s*UPCOMING\s*$/ });
    this.ongoingBadges = page.locator("[data-testid='timeline-session-card'] span").filter({ hasText: /^\s*ONGOING\s*$/ });
    this.completedBadges = page.locator("[data-testid='timeline-session-card'] span").filter({ hasText: /^\s*COMPLETED\s*$/ });
    this.statusChips = page
      .locator("[data-testid='timeline-session-card']")
      .locator("span")
      .filter({ hasText: /^\s*(UPCOMING|ONGOING|COMPLETED)\s*$/ });
  }

  async goto(path = "/today") {
    await this.navigateTo(path);
  }

  async selectDay(dayName: string) {
    await this.page.locator("button").filter({ hasText: new RegExp(dayName, "i") }).first().click();
  }
}
