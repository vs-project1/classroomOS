import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator("input[name='email'], input[type='email'], #email");
    this.passwordInput = page.locator("input[name='password'], input[type='password'], #password");
    this.submitButton = page.locator("button[type='submit']").filter({ hasText: /Sign In|Log In|Continue/i });
    this.errorMessage = page.locator("[data-testid='login-error'], [role='alert'], .text-destructive, p.text-red-500");
  }

  async goto() {
    await this.navigateTo("/login");
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async expectErrorMessage(text: string | RegExp) {
    await expect(this.errorMessage.filter({ hasText: text }).first()).toBeVisible({ timeout: 5000 });
  }
}
