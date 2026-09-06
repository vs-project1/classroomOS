import { type Page, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  readonly greetingHeader: Locator;
  readonly liveClassBadge: Locator;
  readonly liveClassCard: Locator;
  readonly attendanceSummaryGauge: Locator;
  readonly upcomingClassesList: Locator;
  readonly activeAssignmentsCard: Locator;
  readonly pinnedNoticesList: Locator;

  constructor(page: Page) {
    super(page);
    this.greetingHeader = page.locator("h1, h2").filter({ hasText: /Good (Morning|Afternoon|Evening)/i });
    this.liveClassBadge = page.locator("span").filter({ hasText: /NOW|LIVE/i });
    this.liveClassCard = page.locator("[data-testid='live-class-card'], div").filter({ hasText: /Current Class|Live Now|NOW/i });
    this.attendanceSummaryGauge = page.locator("svg circle, [data-testid='attendance-gauge'], div").filter({ hasText: /%/i });
    this.upcomingClassesList = page.locator("[data-testid='upcoming-classes'], div").filter({ hasText: /Today's Timetable|Upcoming Classes|Schedule/i });
    this.activeAssignmentsCard = page.locator("[data-testid='active-assignments-card'], div").filter({ hasText: /Assignments|Homework|Pending/i });
    this.pinnedNoticesList = page.locator("[data-testid='pinned-notices'], div").filter({ hasText: /Notices|Notice Board/i });
  }

  async goto() {
    await this.navigateTo("/");
  }
}
