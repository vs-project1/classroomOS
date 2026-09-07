import { type Page, type Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object for the CR "Morning Roll Call" flow.
 *
 * URL: /cr/take-attendance
 * Auth: CR (or ADMIN) only — `requireAuth(["CR"])` on the page.
 *
 * BEHAVIOR NOTES (read these before changing locators):
 *  - The page receives `roster` from a DB query that filters
 *    `students.semester = "{N} Semester"`. The seed currently inserts
 *    `semester = "4th"` (no "Semester" suffix), so the rendered roster
 *    may be empty in dev seed data. The CR spec asserts on this.
 *  - Default state for every rostered student is "present" — the form
 *    only requires the user to flip the exceptions.
 *  - Statuses supported in the UI: present / absent / late. The server
 *    action also accepts "excused" but no button renders for it.
 */
export class CRTakeAttendancePage extends BasePage {
  readonly pageTitle: Locator;
  readonly rosterRows: Locator;
  readonly studentName: (name: string) => Locator;
  readonly statusButton: (name: string, status: "present" | "absent" | "late") => Locator;
  readonly submitButton: Locator;
  readonly resultBanner: Locator;

  constructor(page: Page) {
    super(page);
    // The page renders <h1>Daily Attendance</h1> at the top of the
    // take-attendance route.
    this.pageTitle = page.locator("h1", { hasText: /(Daily Attendance|Take Attendance|Morning Roll Call)/i });

    // Roster rows: each <div class="...flex justify-between items-center...">
    // contains a <p class="font-semibold"> with the student name and a
    // roll-number sub-paragraph.
    this.rosterRows = page.locator("div.bg-white > div").filter({
      has: page.locator("p.font-semibold"),
    });
    this.studentName = (name: string) =>
      page.locator("p.font-semibold", { hasText: new RegExp(`^${escapeRegExp(name)}$`) });

    this.statusButton = (name: string, status) => {
      // The roster row containing the student's name.
      const row = page.locator("div").filter({
        has: page.locator("p.font-semibold", { hasText: new RegExp(`^${escapeRegExp(name)}$`) }),
      });
      return row.getByRole("button", { name: new RegExp(`^${cap(status)}$`, "i") });
    };

    this.submitButton = page.getByRole("button", { name: /(Submit Attendance|Submit Roll Call)/i });
    // The banner is a single leaf <div> with the result-classes combo. Match
    // by the data-attribute we render so this stays specific even when the
    // banner is a sibling of an unrelated <div> on the page.
    this.resultBanner = page.locator(
      '[data-testid="daily-attendance-result-banner"]',
    );
  }

  async goto() {
    await this.navigateTo("/cr/take-attendance");
  }

  async markStatus(name: string, status: "present" | "absent" | "late") {
    await this.statusButton(name, status).first().click();
  }

  async submit() {
    await this.submitButton.click();
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
