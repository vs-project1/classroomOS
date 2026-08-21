import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AdminAccountsPage extends BasePage {
  readonly createAccountButton: Locator;
  readonly searchInput: Locator;
  readonly roleFilterSelect: Locator;
  readonly accountsTable: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly rollNumberInput: Locator;
  readonly facultySelect: Locator;
  readonly semesterSelect: Locator;
  readonly sectionInput: Locator;
  readonly submitModalButton: Locator;
  readonly tempPasswordDialog: Locator;
  readonly tempPasswordText: Locator;
  readonly copyCredentialsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.createAccountButton = page.locator("button").filter({ hasText: /Create Account|Add User|New Account/i });
    this.searchInput = page.locator("input[placeholder*='Search'], input[type='search']");
    this.roleFilterSelect = page.locator("select[name='roleFilter'], [role='combobox']").filter({ hasText: /Role|All/i });
    this.accountsTable = page.locator("table");
    
    // Modal form locators
    this.nameInput = page.locator("input[name='name'], #name");
    this.emailInput = page.locator("input[name='email'], #email");
    this.roleSelect = page.locator("select[name='role'], #role");
    this.rollNumberInput = page.locator("input[name='rollNumber'], #rollNumber");
    this.facultySelect = page.locator("select[name='faculty'], input[name='faculty'], #faculty");
    this.semesterSelect = page.locator("select[name='semester'], input[name='semester'], #semester");
    this.sectionInput = page.locator("input[name='section'], #section");
    this.submitModalButton = page.locator("button[type='submit']").filter({ hasText: /Create|Save|Add/i });
    
    // Temp password modal / credentials dialog
    this.tempPasswordDialog = page.locator("[role='dialog']").filter({ hasText: /Credentials|Temporary Password|Created/i });
    this.tempPasswordText = page.locator("[data-testid='temp-password-value'], code, [data-temp-password]");
    this.copyCredentialsButton = page.locator("button").filter({ hasText: /Copy Credentials|Copy Password|Copy/i });
  }

  async goto() {
    await this.navigateTo("/admin/accounts");
  }

  async createStudentAccount(data: { name: string; email: string; rollNumber: string; faculty: string; semester: string }) {
    await this.createAccountButton.click();
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    if (await this.roleSelect.isVisible()) {
      await this.roleSelect.selectOption("STUDENT");
    }
    if (await this.rollNumberInput.isVisible()) {
      await this.rollNumberInput.fill(data.rollNumber);
    }
    if (await this.facultySelect.isVisible()) {
      if (await this.facultySelect.evaluate((el) => el.tagName === "SELECT")) {
        await this.facultySelect.selectOption(data.faculty);
      } else {
        await this.facultySelect.fill(data.faculty);
      }
    }
    if (await this.semesterSelect.isVisible()) {
      if (await this.semesterSelect.evaluate((el) => el.tagName === "SELECT")) {
        await this.semesterSelect.selectOption(data.semester);
      } else {
        await this.semesterSelect.fill(data.semester);
      }
    }
    await this.submitModalButton.click();
  }
}
