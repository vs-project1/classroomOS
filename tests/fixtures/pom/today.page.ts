import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class TodaySchedulePage extends BasePage {
  readonly daySelectorButtons: Locator;
  readonly sessionCards: Locator;
  readonly upcomingBadges: Locator;
  readonly ongoingBadges: Locator;
  readonly completedBadges: Locator;

  constructor(page: Page) {
    super(page);
    this.daySelectorButtons = page.locator("[data-testid='day-strip-btn'], button").filter({ hasText: /Sun|Mon|Tue|Wed|Thu|Fri|Sat/i });
    this.sessionCards = page.locator("[data-testid='timeline-session-card'], div.border.rounded-xl, div.rounded-lg");
    this.upcomingBadges = page.locator("span").filter({ hasText: /UPCOMING/i });
    this.ongoingBadges = page.locator("span").filter({ hasText: /ONGOING|IN PROGRESS|NOW|LIVE/i });
    this.completedBadges = page.locator("span").filter({ hasText: /COMPLETED/i });
  }

  async goto() {
    await this.navigateTo("/today");
  }

  async selectDay(dayName: string) {
    await this.page.locator("button").filter({ hasText: new RegExp(dayName, "i") }).first().click();
  }
}
