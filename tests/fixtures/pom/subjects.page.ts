import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class SubjectsPage extends BasePage {
  readonly subjectCards: Locator;
  readonly tabSyllabus: Locator;
  readonly tabSessions: Locator;
  readonly tabAssignments: Locator;
  readonly tabResources: Locator;
  readonly forbiddenErrorBanner: Locator;
  readonly notFoundHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.subjectCards = page.locator("[data-testid='subject-card'], div.border.rounded-xl, div.rounded-lg").filter({ hasText: /CACS|CSIT|Course/i });
    this.tabSyllabus = page.locator("button[role='tab'], button").filter({ hasText: /Syllabus/i });
    this.tabSessions = page.locator("button[role='tab'], button").filter({ hasText: /Sessions|Lectures/i });
    this.tabAssignments = page.locator("button[role='tab'], button").filter({ hasText: /Assignments|Homework/i });
    this.tabResources = page.locator("button[role='tab'], button").filter({ hasText: /Resources|Materials/i });
    this.forbiddenErrorBanner = page.locator("h1, h2, div, p").filter({ hasText: /403|Access Denied|Not Enrolled|Forbidden|Unauthorized/i });
    this.notFoundHeader = page.locator("h1, h2, div, p").filter({ hasText: /404|Not Found|does not exist/i });
  }

  async gotoGrid() {
    await this.navigateTo("/subjects");
  }

  async gotoDetail(subjectId: string) {
    await this.navigateTo(`/subjects/${subjectId}`);
  }
}
