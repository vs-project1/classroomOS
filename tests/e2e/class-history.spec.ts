import { test, expect } from "../fixtures/auth.fixture";

/**
 * Class History (formerly Session Logs) — rename + search & filter (spec §7)
 *
 * Seed: lecture log "Binary Search Trees & Balancing Algorithms" attached to
 * the DSA session; multiple subjects enrolled for the student persona.
 */
test.describe("Class History: rename, search & filter", () => {
  test("TC-HISTORY-01: nav + page use the 'Class History' label", async ({ studentPage }) => {
    await studentPage.goto("/");
    const sidebar = studentPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
    await expect(sidebar.getByText("Class History")).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByText("Session Logs")).toHaveCount(0);

    await sidebar.locator("a[href='/lecture-logs']").first().click();
    await studentPage.waitForURL(/\/lecture-logs/);
    await expect(studentPage.locator("h2").first()).toContainText(/Class History/i);
  });

  test("TC-HISTORY-02: subject filter shows only that subject's rows", async ({ studentPage }) => {
    // subj_dsa_001 is seeded with a logged session
    await studentPage.goto("/lecture-logs?subject=subj_dsa_001");
    const rows = studentPage.locator("a[href^='/sessions/']");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/Data Structures and Algorithms/i);
      await expect(rows.nth(i)).not.toContainText(/Web Technology/i);
    }
  });

  test("TC-HISTORY-03: search with no match shows empty state and Clear restores rows", async ({
    studentPage,
  }) => {
    await studentPage.goto("/lecture-logs");
    const rows = studentPage.locator("a[href^='/sessions/']");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    await studentPage.getByTestId("history-search").fill("zzzznomatch");
    await studentPage.getByTestId("history-filter-btn").click();
    await studentPage.waitForURL(/[?&]q=zzzznomatch/);

    await expect(studentPage.getByText(/No classes match your search or filter/i)).toBeVisible();
    const clear = studentPage.getByTestId("history-clear-btn");
    await expect(clear).toBeVisible();

    await clear.click();
    await studentPage.waitForURL((u) => !/[?&](q|subject)=/.test(String(u)), { timeout: 15000 });
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });

  test("TC-HISTORY-04: positive search finds the seeded lecture topic", async ({ studentPage }) => {
    await studentPage.goto("/lecture-logs?q=binary%20search%20trees");
    const rows = studentPage.locator("a[href^='/sessions/']");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    await expect(studentPage.getByTestId("history-clear-btn")).toBeVisible();
  });

  test("TC-HISTORY-05: semester filter keeps every session of subjects enrolled that semester", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000); // first-visit route compile budget under sequential suite

    // Seed facts (scripts/seed-e2e.ts): every enrollment of the student persona
    // (enr_std_dsa / enr_std_dbms / enr_std_wt) is semester 4, and all six seeded
    // class sessions belong to subj_dsa_001 — so semester=4 must retain ALL rows.
    await studentPage.goto("/lecture-logs?semester=4");

    const semesterSelect = studentPage.getByTestId("history-semester");
    await expect(semesterSelect).toBeVisible({ timeout: 15000 });
    await expect(semesterSelect).toHaveValue("4");

    const rows = studentPage.locator("a[href^='/sessions/']");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/Data Structures and Algorithms/i);
      await expect(rows.nth(i)).not.toContainText(/Web Technology/i);
    }
  });

  test("TC-HISTORY-06: date filter pins history to the newest seeded session's NPT day", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000);

    // Ground the expected date in SEEDED DATA, never wall clock: the seeder
    // stamps its last DSA session at seed-time `now`. If the suite crosses
    // NPT midnight between seeding and this test, "today" no longer matches —
    // so read the seeded instant straight from local.test.db (read-only).
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url: "file:local.test.db" });
    let nptDate: string;
    try {
      const result = await client.execute(
        "SELECT MAX(session_date) AS ts FROM class_sessions WHERE subject_id = 'subj_dsa_001'"
      );
      const epochSeconds = Number(result.rows[0]?.ts);
      if (!Number.isFinite(epochSeconds) || epochSeconds <= 0) {
        throw new Error("seeded DSA sessions missing — global setup did not run?");
      }
      nptDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(epochSeconds * 1000));
    } finally {
      client.close();
    }

    await studentPage.goto(`/lecture-logs?date=${nptDate}`);
    await expect(studentPage.getByTestId("history-date")).toHaveValue(nptDate);

    // Explicit seed expectation: of the six seeded DSA sessions only
    // sess_hist_dsa_6 carries the max session_date; all others sit 1/3/7/10/14
    // days earlier — so pinning to that NPT day yields EXACTLY one row.
    const rows = studentPage.locator("a[href^='/sessions/']");
    await expect(rows).toHaveCount(1, { timeout: 15000 });
    await expect(rows.first()).toContainText(/Data Structures and Algorithms/i);
  });

  test("TC-HISTORY-07: unit control lists seeded units and Clear resets all five params", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000);

    // Units ARE seeded (scripts/seed-e2e.ts §8): unit_dsa_01 belongs to subj_dsa_001.
    await studentPage.goto("/lecture-logs");
    const unitSelect = studentPage.getByTestId("history-unit");
    await expect(unitSelect).toBeVisible({ timeout: 15000 });
    await expect(unitSelect.locator("option[value='unit_dsa_01']")).toHaveText(
      "Unit 1: Introduction to Data Structures & Algorithms"
    );

    // Honest textual matching: the DSA lecture log ("Binary Search Trees &
    // Balancing Algorithms" / "Solve Exercise 4.2") never mentions the seeded
    // unit or chapter titles, so selecting the unit legitimately yields the
    // no-match empty state rather than any rows.
    const nptToday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    await studentPage.goto(
      `/lecture-logs?q=binary&subject=subj_dsa_001&semester=4&date=${nptToday}&unit=unit_dsa_01`
    );
    await expect(studentPage.getByTestId("history-unit")).toHaveValue("unit_dsa_01");
    await expect(studentPage.getByText(/No classes match your search or filter/i)).toBeVisible();

    // Clear must wipe q + subject + semester + date + unit and restore rows.
    const clear = studentPage.getByTestId("history-clear-btn");
    await expect(clear).toBeVisible();
    await clear.click();
    await studentPage.waitForURL((u) => !/[?&](q|subject|semester|date|unit)=/.test(String(u)), {
      timeout: 15000,
    });

    const rows = studentPage.locator("a[href^='/sessions/']");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
  });
});
