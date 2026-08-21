import { type Page, type Locator, expect } from "@playwright/test";

export class BasePage {
  readonly page: Page;
  readonly toastMessage: Locator;
  readonly studentSidebar: Locator;
  readonly adminSidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toastMessage = page.locator("[role='status'], [role='alert'], .toast, [data-sonner-toast]");
    this.studentSidebar = page.locator("aside").filter({ hasText: /Student Portal|Dashboard|Routine/i });
    this.adminSidebar = page.locator("aside").filter({ hasText: /Admin Console|Command Center/i });
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectToast(message: string | RegExp) {
    await expect(this.toastMessage.filter({ hasText: message }).first()).toBeVisible({ timeout: 5000 });
  }

  async waitForServerAction() {
    await this.page.waitForLoadState("networkidle");
  }
}
