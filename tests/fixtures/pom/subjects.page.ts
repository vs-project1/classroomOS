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
  readonly breadcrumbs: Locator;

  constructor(page: Page) {
    super(page);
    this.subjectCards = page.locator("[data-testid='subject-card'], div.border.rounded-xl, div.rounded-lg").filter({ hasText: /CACS|CSIT|Course/i });
    // Subject workspace tabs are URL-driven links (?tab=…) in the AppShell IA.
    this.tabSyllabus = page.locator("a[data-testid='subject-tab-syllabus']");
    this.tabSessions = page.locator("a[data-testid='subject-tab-classes']");
    this.tabAssignments = page.locator("a[data-testid='subject-tab-assignments']");
    this.tabResources = page.locator("a[data-testid='subject-tab-resources']");
    this.breadcrumbs = page.getByTestId("breadcrumbs");
    this.forbiddenErrorBanner = page.locator("h1, h2, div, p").filter({ hasText: /403|Access Denied|Not Enrolled|Forbidden|Unauthorized/i });
    this.notFoundHeader = page.locator("h1, h2, div, p").filter({ hasText: /404|Not Found|does not exist/i });
  }

  async gotoGrid() {
    await this.navigateTo("/subjects");
  }

  async gotoDetail(subjectId: string) {
    await this.navigateTo(`/subjects/${subjectId}`);
  }

  async gotoDetailTab(slug: string, tab: string) {
    await this.navigateTo(`/subjects/${slug}?tab=${tab}`);
  }
}
