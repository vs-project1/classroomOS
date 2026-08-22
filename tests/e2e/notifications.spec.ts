import { test, expect } from "../fixtures/auth.fixture";

/**
 * Notifications hub — seeded feed & read-state actions
 *
 * Seed baseline (scripts/seed-e2e.ts §12, all for usr_student_001):
 *  - notif_student_1  unread · notice     · link /notices → renders as a whole-card <a>
 *  - notif_student_2  unread · assignment · NO link       → renders with a "Mark read" ghost button
 *  - notif_student_3  read   · system     · NO link       → muted card, no controls
 *  created_at staggered now / -1h / -24h; page orders newest-first.
 *
 * Page contract (src/app/(student)/notifications/page.tsx):
 *  - Per-row "Mark read" renders ONLY on unread rows without a safe internal
 *    link; linked unread rows are pure anchors (no per-row control).
 *  - Unread-count chip ("N unread") and "Mark all as read" render only while
 *    unread > 0. The page defines no data-testids, so assertions use real
 *    roles/text/classes.
 */

test.describe("Notifications: seeded feed & read-state actions", () => {
  test("TC-NOTIF-01: page renders heading, '2 unread' chip, and CAMPUS sidebar entry", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000);
    await studentPage.setViewportSize({ width: 1280, height: 800 });
    await studentPage.goto("/notifications");
    await studentPage.waitForLoadState("domcontentloaded");

    // Page heading is an <h2> (no h1 on this screen)
    await expect(studentPage.getByRole("heading", { name: "Notifications" })).toBeVisible({
      timeout: 10000,
    });

    // Exactly two seeded rows are unread → chip shows the count
    await expect(studentPage.getByText("2 unread", { exact: true })).toBeVisible();

    // Sidebar CAMPUS group carries the Notifications nav entry
    const sidebar = studentPage.locator("aside").filter({ hasText: /Classroom OS/i }).first();
    await expect(sidebar.getByText("CAMPUS")).toBeVisible();
    const navEntry = sidebar.locator("a[href='/notifications']").first();
    await expect(navEntry).toBeVisible();
    await expect(navEntry).toContainText("Notifications");
  });

  test("TC-NOTIF-02: seeded titles render with correct link vs mark-read affordances", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000);
    await studentPage.setViewportSize({ width: 1280, height: 800 });
    await studentPage.goto("/notifications");
    await studentPage.waitForLoadState("domcontentloaded");

    // All three seeded titles are listed
    await expect(studentPage.getByText("Mid-term schedule posted")).toBeVisible();
    await expect(studentPage.getByText("New assignment in DSA")).toBeVisible();
    await expect(studentPage.getByText("Welcome to Classroom OS")).toBeVisible();

    // The notice row is itself an anchor to /notices — filtered by title so the
    // sidebar's "Notices" nav link cannot satisfy the assertion.
    const noticeRow = studentPage
      .locator("a[href='/notices']")
      .filter({ hasText: "Mid-term schedule posted" });
    await expect(noticeRow).toHaveCount(1);
    await expect(noticeRow).toBeVisible();
    // Linked rows expose no per-row control
    await expect(noticeRow.getByRole("button", { name: "Mark read" })).toHaveCount(0);

    // Read system row is a plain card WITHOUT any mark-read button
    const welcomeRow = studentPage.locator("div.group").filter({ hasText: "Welcome to Classroom OS" });
    await expect(welcomeRow).toHaveCount(1);
    await expect(welcomeRow.getByRole("button", { name: "Mark read" })).toHaveCount(0);

    // Exactly one "Mark read" exists in total: the linkless unread DSA row
    await expect(studentPage.getByRole("button", { name: "Mark read" })).toHaveCount(1);
  });

  test("TC-NOTIF-03: per-row Mark read decrements the chip to 1 unread and persists across reload", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000);
    await studentPage.setViewportSize({ width: 1280, height: 800 });
    await studentPage.goto("/notifications");
    await studentPage.waitForLoadState("domcontentloaded");

    const markRead = studentPage.getByRole("button", { name: "Mark read" });
    await expect(markRead).toHaveCount(1); // only the linkless unread row offers it
    await expect(studentPage.getByText("2 unread", { exact: true })).toBeVisible();

    await markRead.click();

    // Server action + revalidatePath refresh the chip without a manual reload
    await expect(studentPage.getByText("1 unread", { exact: true })).toBeVisible();

    await studentPage.reload();
    await studentPage.waitForLoadState("domcontentloaded");

    // Persisted through the server action: still exactly one unread row, and
    // the flipped DSA row no longer exposes its mark-read control.
    await expect(studentPage.getByText("1 unread", { exact: true })).toBeVisible();
    await expect(studentPage.getByText("New assignment in DSA")).toBeVisible();
    await expect(studentPage.getByRole("button", { name: "Mark read" })).toHaveCount(0);
  });

  test("TC-NOTIF-04: Mark all as read clears the unread chip entirely and survives reload", async ({
    studentPage,
  }) => {
    test.setTimeout(60_000);
    await studentPage.setViewportSize({ width: 1280, height: 800 });
    await studentPage.goto("/notifications");
    await studentPage.waitForLoadState("domcontentloaded");

    const markAll = studentPage.getByRole("button", { name: "Mark all as read" });
    const unreadChip = studentPage.getByText(/^\d+ unread$/);

    // Fresh seed → "2 unread"; standalone-safe if TC-NOTIF-03 ran earlier → "1 unread"
    await expect(unreadChip).toBeVisible({ timeout: 10000 });
    await expect(markAll).toBeVisible();

    await markAll.click();

    // Chip and bulk action both unmount once unread === 0
    await expect(unreadChip).toHaveCount(0);
    await expect(markAll).toHaveCount(0);

    await studentPage.reload();
    await studentPage.waitForLoadState("domcontentloaded");

    await expect(studentPage.getByText(/^\d+ unread$/)).toHaveCount(0);
    await expect(studentPage.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);

    // Rows remain listed after the flip — just fully read now
    await expect(studentPage.getByText("Mid-term schedule posted")).toBeVisible();
    await expect(studentPage.getByText("New assignment in DSA")).toBeVisible();
    await expect(studentPage.getByText("Welcome to Classroom OS")).toBeVisible();
  });
});
