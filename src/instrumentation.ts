export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Avoid running schedulers during build phase or test runs
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return;
    }

    const { db } = await import("@/db");
    const { telegramSettings } = await import("@/db/schema");
    const { executeTelegramBrief } = await import("@/features/telegram/services/telegram-brief-service");

    console.log("[ClassroomOS:Scheduler] Initializing in-process Telegram routine briefing poller...");

    // Check every 60 seconds
    const interval = setInterval(async () => {
      try {
        const [settings] = await db.select().from(telegramSettings).limit(1);
        if (!settings || !settings.botToken || !settings.isEnabled) {
          return;
        }

        const now = new Date();
        const nptTime = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kathmandu",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now);

        const morningTarget = settings.morningBriefTime || "05:30";
        const eveningTarget = settings.eveningBriefTime || "20:00";

        if (nptTime === morningTarget) {
          console.log(`[ClassroomOS:Scheduler] Triggering morning routine briefing at NPT ${nptTime}...`);
          const res = await executeTelegramBrief({
            briefType: "morning",
            source: "scheduler",
          });
          console.log(`[ClassroomOS:Scheduler] Morning briefing outcome:`, {
            ok: res.ok,
            sent: res.sentCount,
            skipped: res.skippedCount,
            failed: res.failedCount,
          });
        } else if (nptTime === eveningTarget) {
          console.log(`[ClassroomOS:Scheduler] Triggering evening routine briefing at NPT ${nptTime}...`);
          const res = await executeTelegramBrief({
            briefType: "evening",
            source: "scheduler",
          });
          console.log(`[ClassroomOS:Scheduler] Evening briefing outcome:`, {
            ok: res.ok,
            sent: res.sentCount,
            skipped: res.skippedCount,
            failed: res.failedCount,
          });
        }
      } catch (err) {
        console.error("[ClassroomOS:Scheduler] Background briefing check error:", err);
      }
    }, 60000);

    if (typeof interval.unref === "function") {
      interval.unref();
    }
  }
}
