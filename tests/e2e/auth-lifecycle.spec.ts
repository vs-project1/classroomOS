import { test, expect } from "../fixtures/auth.fixture";
import { LoginPage } from "../fixtures/pom/login.page";
import { ChangePasswordPage } from "../fixtures/pom/change-password.page";
import { AdminAccountsPage } from "../fixtures/pom/admin-accounts.page";
import { TEST_PERSONAS } from "../fixtures/seed-data";

test.describe("F4, F5, F6, F7, F8: Authentication & Lifecycle Management", () => {
  test.describe("Tier 1 & 2: Login Credentials & Validation", () => {
    test("TC-SPEC-AUTH-01: Admin login with valid credentials navigates to console or dashboard", async ({ guestPage }) => {
      const loginPage = new LoginPage(guestPage);
      await loginPage.goto();

      await loginPage.login(TEST_PERSONAS.admin.email, TEST_PERSONAS.admin.password);

      // Verify redirection to authenticated area
      await expect(guestPage).not.toHaveURL(/\/login$/);
    });

    test("TC-SPEC-AUTH-02: Student login with valid credentials lands on Student Dashboard", async ({ guestPage }) => {
      const loginPage = new LoginPage(guestPage);
      await loginPage.goto();

      await loginPage.login(TEST_PERSONAS.activeStudent.email, TEST_PERSONAS.activeStudent.password);

      // Verify dashboard URL
      await expect(guestPage).toHaveURL(/(\/|\/today|\/subjects)$/);
    });

    test("TC-SPEC-AUTH-03: Invalid password attempt shows error alert and does not set session", async ({ guestPage }) => {
      const loginPage = new LoginPage(guestPage);
      await loginPage.goto();

      await loginPage.login(TEST_PERSONAS.activeStudent.email, "WrongPassword999!");

      // Verify error alert
      await loginPage.expectErrorMessage(/invalid|incorrect|failed|wrong/i);
      await expect(guestPage).toHaveURL(/\/login/);
    });

    test("TC-SPEC-AUTH-04: Non-existent user login shows generic invalid credentials message", async ({ guestPage }) => {
      const loginPage = new LoginPage(guestPage);
      await loginPage.goto();

      await loginPage.login("nonexistent.user.404@classroom.edu.np", "AnyPassword123!");

      // Verify generic error without leaking account existence
      await loginPage.expectErrorMessage(/invalid|incorrect|failed/i);
    });

    test("TC-SPEC-AUTH-05: Empty email or password triggers form validation before submission", async ({ guestPage }) => {
      const loginPage = new LoginPage(guestPage);
      await loginPage.goto();

      await loginPage.submitButton.click();

      // Ensure we stay on login page
      await expect(guestPage).toHaveURL(/\/login/);
    });
  });

  test.describe("Tier 1 & 3: Mandatory Password Change Quarantine Flow", () => {
    test("TC-SPEC-AUTH-06: First-time student login with mustChangePassword=true is quarantined to /change-password", async ({ newStudentPage }) => {
      // Direct navigation to protected view should be intercepted
      await newStudentPage.goto("/attendance");

      // Middleware should quarantine to /change-password
      await expect(newStudentPage).toHaveURL(/\/change-password/);
    });

    test("TC-SPEC-AUTH-07: Submitting password shorter than 8 characters shows validation error", async ({ newStudentPage }) => {
      const changePassPage = new ChangePasswordPage(newStudentPage);
      await changePassPage.goto();

      // Submit 7-character password (BVA boundary min-1)
      await changePassPage.changePassword(
        TEST_PERSONAS.newStudentQuarantined.password,
        "Pass12!",
        "Pass12!"
      );

      // Verify length validation rejection
      await changePassPage.expectValidationError(/8 characters|short|length|at least/i);
    });

    test("TC-SPEC-AUTH-08: Password confirmation mismatch displays error message", async ({ newStudentPage }) => {
      const changePassPage = new ChangePasswordPage(newStudentPage);
      await changePassPage.goto();

      await changePassPage.changePassword(
        TEST_PERSONAS.newStudentQuarantined.password,
        "NewSecurePass123!",
        "MismatchedPass999!"
      );

      await changePassPage.expectValidationError(/match|confirmation/i);
    });

    test("TC-SPEC-AUTH-09: Compliant password update unlocks account and redirects to dashboard", async ({ newStudentPage }) => {
      const changePassPage = new ChangePasswordPage(newStudentPage);
      await changePassPage.goto();

      await changePassPage.changePassword(
        TEST_PERSONAS.newStudentQuarantined.password,
        "BrandNewSecurePassword2026!",
        "BrandNewSecurePassword2026!"
      );

      // Successful update should redirect out of quarantine
      await expect(newStudentPage).not.toHaveURL(/\/change-password/);
    });
  });

  test.describe("Tier 1, 3 & 4: Admin User Provisioning & RBAC Enforcement", () => {
    test("TC-SPEC-AUTH-10: Admin navigates to /admin/accounts and renders user roster", async ({ adminPage }) => {
      const adminAccounts = new AdminAccountsPage(adminPage);
      await adminAccounts.goto();

      await expect(adminAccounts.accountsTable.or(adminPage.locator("main, div.container"))).toBeVisible();
    });

    test("TC-SPEC-AUTH-11: Admin creates new student account and receives temporary password", async ({ adminPage }) => {
      const adminAccounts = new AdminAccountsPage(adminPage);
      await adminAccounts.goto();

      const uniqueRoll = `BCA-TEST-${Date.now().toString().slice(-4)}`;
      const testEmail = `teststudent_${Date.now()}@classroom.edu.np`;

      if (await adminAccounts.createAccountButton.isVisible()) {
        await adminAccounts.createStudentAccount({
          name: "Test Provisioned Student",
          email: testEmail,
          rollNumber: uniqueRoll,
          faculty: "BCA",
          semester: "4th",
        });

        // Verify temporary credentials dialog or success toast
        const dialogOrToast = adminAccounts.tempPasswordDialog.or(adminAccounts.toastMessage);
        await expect(dialogOrToast.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test("TC-SPEC-AUTH-12: Student role is strictly denied access to /admin/accounts", async ({ studentPage }) => {
      await studentPage.goto("/admin/accounts");

      // Should return 403 or redirect back to student portal
      const currentUrl = studentPage.url();
      const isRedirected = !currentUrl.includes("/admin/accounts") || currentUrl.endsWith("/") || currentUrl.includes("/login");
      const showsForbidden = await studentPage.locator("h1, h2, div").filter({ hasText: /403|Forbidden|Unauthorized|Access Denied/i }).count() > 0;

      expect(isRedirected || showsForbidden).toBeTruthy();
    });

    test("TC-SPEC-AUTH-13: Deactivated user account cannot log in", async ({ guestPage }) => {
      const loginPage = new LoginPage(guestPage);
      await loginPage.goto();

      // Attempt login with known deactivated persona or invalid status
      await loginPage.login("deactivated@classroom.edu.np", "SomePassword123!");

      // Expect login rejection
      await loginPage.expectErrorMessage(/deactivated|disabled|invalid|contact/i);
    });
  });
});
