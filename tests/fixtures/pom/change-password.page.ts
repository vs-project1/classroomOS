import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ChangePasswordPage extends BasePage {
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly validationError: Locator;

  constructor(page: Page) {
    super(page);
    this.currentPasswordInput = page.locator("input[name='currentPassword'], input[name='tempPassword'], #currentPassword");
    this.newPasswordInput = page.locator("input[name='newPassword'], #newPassword");
    this.confirmPasswordInput = page.locator("input[name='confirmPassword'], #confirmPassword");
    this.submitButton = page.locator("button[type='submit']").filter({ hasText: /Update Password|Change Password|Set Password/i });
    this.validationError = page.locator("[role='alert'], .text-destructive, p.text-red-500, [data-testid='password-error']");
  }

  async goto() {
    await this.navigateTo("/change-password");
  }

  async changePassword(current: string, next: string, confirm: string) {
    if (await this.currentPasswordInput.isVisible()) {
      await this.currentPasswordInput.fill(current);
    }
    await this.newPasswordInput.fill(next);
    await this.confirmPasswordInput.fill(confirm);
    await this.submitButton.scrollIntoViewIfNeeded();
    await this.submitButton.click();
  }

  async expectValidationError(text: string | RegExp) {
    await expect(this.page.locator("[role='alert'], [data-testid='password-error'], .text-destructive").filter({ hasText: text }).first()).toBeVisible({ timeout: 10000 });
  }
}
