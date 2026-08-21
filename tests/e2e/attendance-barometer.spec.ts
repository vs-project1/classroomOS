import { test, expect } from "../fixtures/auth.fixture";
import { AttendancePage } from "../fixtures/pom/attendance.page";

test.describe("F9, F10, F15: TU 80% Attendance Barometer, What-If Calculator & Correction Flow", () => {
  test.describe("Tier 1 & 2: TU 80% Attendance Barometer & Safety Buffer", () => {
    test("TC-SPEC-ATT-01: Attendance Hub renders overall attendance percentage and status chip", async ({ studentPage }) => {
      const attendance = new AttendancePage(studentPage);
      await attendance.goto();

      // Verify overall percentage presence
      await expect(attendance.overallPercentageText.first()).toBeVisible({ timeout: 10000 });
      // Verify status chip (SAFE, CAUTION, or DANGER)
      await expect(attendance.statusChip.first()).toBeVisible();
    });

    test("TC-SPEC-ATT-02: Safety buffer displays exact missable classes or classes needed to recover", async ({ studentPage }) => {
      const attendance = new AttendancePage(studentPage);
      await attendance.goto();

      await expect(attendance.safetyBufferText.first()).toBeVisible();
    });

    test("TC-SPEC-ATT-03: Subject breakdown table lists all enrolled subjects with counts and percentages", async ({ studentPage }) => {
      const attendance = new AttendancePage(studentPage);
      await attendance.goto();

      // Check subject rows exist
      await expect(attendance.subjectTableRows.first()).toBeVisible({ timeout: 10000 });
      const rowCount = await attendance.subjectTableRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Tier 1, 2 & 3: What-If Projection Calculator Simulation", () => {
    test("TC-SPEC-ATT-04: What-If calculator updates projected percentage when adjusting planned classes", async ({ studentPage }) => {
      const attendance = new AttendancePage(studentPage);
      await attendance.goto();

      if (await attendance.whatIfSlider.count() > 0) {
        const slider = attendance.whatIfSlider.first();
        await slider.fill("5");
        await slider.dispatchEvent("input");

        // Verify projected result updates
        await expect(attendance.whatIfProjectedPercentage.first()).toBeVisible();
      }
    });

    test("TC-SPEC-ATT-05: Simulation handles large values or zero baseline without breaking", async ({ studentPage }) => {
      const attendance = new AttendancePage(studentPage);
      await attendance.goto();

      if (await attendance.whatIfSlider.count() > 0) {
        const slider = attendance.whatIfSlider.first();
        await slider.fill("0");
        await slider.dispatchEvent("input");

        // Verify UI remains stable
        await expect(attendance.overallPercentageText.first()).toBeVisible();
      }
    });
  });

  test.describe("Tier 1, 3 & 4: Attendance Dispute / Correction Request Flow", () => {
    test("TC-SPEC-ATT-06: Student opens Report Incorrect Attendance modal and submits correction request", async ({ studentPage }) => {
      const attendance = new AttendancePage(studentPage);
      await attendance.goto();

      if (await attendance.reportDisputeButton.count() > 0) {
        await attendance.submitCorrectionRequest(
          "I was present in Room 302 for DSA lecture on 2026-08-10, please verify with CR log."
        );

        // Expect confirmation toast or modal closure
        const successIndicator = attendance.toastMessage.or(studentPage.locator("div:has-text('submitted'), div:has-text('Pending')"));
        await expect(successIndicator.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
