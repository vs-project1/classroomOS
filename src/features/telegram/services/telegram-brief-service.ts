import crypto from "crypto";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  telegramSettings,
  semesterTelegramConfigs,
  telegramBroadcastLogs,
  weeklyRoutine,
} from "@/db/schema";
import { sendTelegramMessage } from "./telegram-client";
import {
  formatRoutineBriefMessage,
  formatWeekendGreetingMessage,
  type RoutineSlotInfo,
} from "./formatters";
import { areSemestersEqual } from "@/lib/utils/roman";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type ExecuteTelegramBriefOptions = {
  briefType?: "morning" | "evening";
  force?: boolean;
  semester?: string;
  triggeredByUserId?: string | null;
  source?: "cron" | "manual" | "scheduler";
};

export type TelegramBriefResult = {
  ok: boolean;
  briefType: "morning" | "evening";
  dayName: string;
  totalConfigured: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  results: Array<{
    semester: string;
    status: "success" | "skipped" | "failed";
    reason?: string;
    error?: string;
    messageText?: string;
  }>;
};

/**
 * Core domain service that executes the morning or evening Telegram routine briefing.
 * Handles Nepal timezone normalization, semester matching, weekend suppression,
 * and idempotency / duplicate execution prevention.
 */
export async function executeTelegramBrief(
  options: ExecuteTelegramBriefOptions = {}
): Promise<TelegramBriefResult> {
  const [settings] = await db.select().from(telegramSettings).limit(1);
  if (!settings || !settings.botToken || !settings.isEnabled) {
    return {
      ok: false,
      briefType: options.briefType || "morning",
      dayName: "Unknown",
      totalConfigured: 0,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      results: [
        {
          semester: options.semester || "All",
          status: "failed",
          error: "Telegram Bot is not configured or is currently disabled in Settings.",
        },
      ],
    };
  }

  // 1. Determine Nepal (Asia/Kathmandu) Time
  const now = new Date();
  const nptFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = nptFormatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const todayDayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort);

  const briefType = options.briefType || (hour < 12 ? "morning" : "evening");
  const expectedLogType = briefType === "morning" ? "morning_brief" : "evening_brief";

  // NPT start & end of day for duplicate prevention
  const ymdNpt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  const startOfDayNpt = new Date(`${ymdNpt}T00:00:00+05:45`);
  const endOfDayNpt = new Date(`${ymdNpt}T23:59:59+05:45`);

  const weekendDays: number[] = settings.weekendDays || [0, 6]; // 0: Sunday, 6: Saturday
  const isTodayWeekend = weekendDays.includes(todayDayIndex);

  let configs = await db.select().from(semesterTelegramConfigs);
  if (options.semester) {
    configs = configs.filter((c) => areSemestersEqual(c.semester, options.semester));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const results: TelegramBriefResult["results"] = [];
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // -------------------------------------------------------------
  // Morning Routine Execution
  // -------------------------------------------------------------
  if (briefType === "morning") {
    // Suppress weekend morning routine broadcasts unless force is specified
    if (isTodayWeekend && !options.force) {
      return {
        ok: true,
        briefType: "morning",
        dayName: DAYS[todayDayIndex],
        totalConfigured: configs.length,
        sentCount: 0,
        skippedCount: configs.length,
        failedCount: 0,
        results: configs.map((c) => ({
          semester: c.semester,
          status: "skipped",
          reason: `Today is ${DAYS[todayDayIndex]} (Weekend). Morning alarm suppressed.`,
        })),
      };
    }

    const todayRoutines = await db.query.weeklyRoutine.findMany({
      where: eq(weeklyRoutine.dayOfWeek, todayDayIndex),
      orderBy: [asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    });

    for (const config of configs) {
      if (!config.chatId) {
        skippedCount++;
        results.push({
          semester: config.semester,
          status: "skipped",
          reason: "No Telegram Chat ID configured.",
        });
        continue;
      }

      if (!config.autoMorningBrief && !options.force) {
        skippedCount++;
        results.push({
          semester: config.semester,
          status: "skipped",
          reason: "Morning briefs are toggled OFF for this semester.",
        });
        continue;
      }

      // Deduplication check: prevent multiple morning broadcasts on the same day
      if (!options.force) {
        const existingBroadcast = await db.query.telegramBroadcastLogs.findFirst({
          where: and(
            eq(telegramBroadcastLogs.semester, config.semester),
            eq(telegramBroadcastLogs.type, "morning_brief"),
            eq(telegramBroadcastLogs.status, "success"),
            gte(telegramBroadcastLogs.createdAt, startOfDayNpt),
            lte(telegramBroadcastLogs.createdAt, endOfDayNpt)
          ),
        });

        if (existingBroadcast) {
          skippedCount++;
          results.push({
            semester: config.semester,
            status: "skipped",
            reason: `Already broadcasted morning brief for today (${ymdNpt}).`,
          });
          continue;
        }
      }

      const slots: RoutineSlotInfo[] = todayRoutines
        .filter((r) => areSemestersEqual(r.subject?.semester, config.semester))
        .map((r) => ({
          startTime: r.startTime,
          endTime: r.endTime,
          subjectName: r.subject?.name ?? "Subject",
          teacherName: r.teacherName || r.subject?.teacher?.name || null,
          room: r.room,
          notes: r.notes,
        }));

      const text = formatRoutineBriefMessage({
        titlePrefix: "🌅 Today's Routine",
        semester: config.semester,
        date: now,
        dayName: DAYS[todayDayIndex],
        slots,
        appUrl,
      });

      const sendRes = await sendTelegramMessage({
        token: settings.botToken,
        chatId: config.chatId,
        text,
        messageThreadId: config.messageThreadId,
      });

      await db.insert(telegramBroadcastLogs).values({
        id: crypto.randomUUID(),
        semester: config.semester,
        type: "morning_brief",
        messageText: text,
        status: sendRes.ok ? "success" : "failed",
        errorMessage: sendRes.error ?? null,
        sentByUserId: options.triggeredByUserId ?? null,
      });

      if (sendRes.ok) {
        sentCount++;
        results.push({ semester: config.semester, status: "success", messageText: text });
      } else {
        failedCount++;
        results.push({
          semester: config.semester,
          status: "failed",
          error: sendRes.error || "Failed to deliver message.",
        });
      }
    }
  } else {
    // -------------------------------------------------------------
    // Evening Routine Execution (Prep for Tomorrow)
    // -------------------------------------------------------------
    const tomorrowDayIndex = (todayDayIndex + 1) % 7;
    const isTomorrowWeekend = weekendDays.includes(tomorrowDayIndex);

    // Case A: Friday evening (start of weekend)
    if (isTomorrowWeekend && !isTodayWeekend && !options.force) {
      for (const config of configs) {
        if (!config.chatId || (!config.autoEveningBrief && !options.force)) {
          skippedCount++;
          results.push({
            semester: config.semester,
            status: "skipped",
            reason: "Chat ID not configured or evening brief toggled off.",
          });
          continue;
        }

        const text = formatWeekendGreetingMessage({
          type: "friday_wrap",
          semester: config.semester,
        });

        const sendRes = await sendTelegramMessage({
          token: settings.botToken,
          chatId: config.chatId,
          text,
          messageThreadId: config.messageThreadId,
        });

        await db.insert(telegramBroadcastLogs).values({
          id: crypto.randomUUID(),
          semester: config.semester,
          type: "evening_brief",
          messageText: text,
          status: sendRes.ok ? "success" : "failed",
          errorMessage: sendRes.error ?? null,
          sentByUserId: options.triggeredByUserId ?? null,
        });

        if (sendRes.ok) {
          sentCount++;
          results.push({ semester: config.semester, status: "success", messageText: text });
        } else {
          failedCount++;
          results.push({
            semester: config.semester,
            status: "failed",
            error: sendRes.error || "Failed to deliver message.",
          });
        }
      }
    } else if (todayDayIndex === 6 && !options.force) {
      // Case B: Saturday evening -> still weekend, keep quiet
      return {
        ok: true,
        briefType: "evening",
        dayName: DAYS[todayDayIndex],
        totalConfigured: configs.length,
        sentCount: 0,
        skippedCount: configs.length,
        failedCount: 0,
        results: configs.map((c) => ({
          semester: c.semester,
          status: "skipped",
          reason: "Saturday night (weekend). Evening broadcast kept silent.",
        })),
      };
    } else {
      // Case C: Regular evening or Sunday night (prepping for Monday morning)
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 1);

      const tomorrowRoutines = await db.query.weeklyRoutine.findMany({
        where: eq(weeklyRoutine.dayOfWeek, tomorrowDayIndex),
        orderBy: [asc(weeklyRoutine.startTime)],
        with: {
          subject: {
            with: { teacher: true },
          },
        },
      });

      for (const config of configs) {
        if (!config.chatId) {
          skippedCount++;
          results.push({
            semester: config.semester,
            status: "skipped",
            reason: "No Telegram Chat ID configured.",
          });
          continue;
        }

        if (!config.autoEveningBrief && !options.force) {
          skippedCount++;
          results.push({
            semester: config.semester,
            status: "skipped",
            reason: "Evening briefs are toggled OFF for this semester.",
          });
          continue;
        }

        // Deduplication check: prevent multiple evening broadcasts on the same day
        if (!options.force) {
          const existingBroadcast = await db.query.telegramBroadcastLogs.findFirst({
            where: and(
              eq(telegramBroadcastLogs.semester, config.semester),
              eq(telegramBroadcastLogs.type, "evening_brief"),
              eq(telegramBroadcastLogs.status, "success"),
              gte(telegramBroadcastLogs.createdAt, startOfDayNpt),
              lte(telegramBroadcastLogs.createdAt, endOfDayNpt)
            ),
          });

          if (existingBroadcast) {
            skippedCount++;
            results.push({
              semester: config.semester,
              status: "skipped",
              reason: `Already broadcasted evening brief for today (${ymdNpt}).`,
            });
            continue;
          }
        }

        const slots: RoutineSlotInfo[] = tomorrowRoutines
          .filter((r) => areSemestersEqual(r.subject?.semester, config.semester))
          .map((r) => ({
            startTime: r.startTime,
            endTime: r.endTime,
            subjectName: r.subject?.name ?? "Subject",
            teacherName: r.teacherName || r.subject?.teacher?.name || null,
            room: r.room,
            notes: r.notes,
          }));

        const text = formatRoutineBriefMessage({
          titlePrefix: "🌙 Tomorrow's Routine",
          semester: config.semester,
          date: targetDate,
          dayName: DAYS[tomorrowDayIndex],
          slots,
          appUrl,
        });

        const sendRes = await sendTelegramMessage({
          token: settings.botToken,
          chatId: config.chatId,
          text,
          messageThreadId: config.messageThreadId,
        });

        await db.insert(telegramBroadcastLogs).values({
          id: crypto.randomUUID(),
          semester: config.semester,
          type: "evening_brief",
          messageText: text,
          status: sendRes.ok ? "success" : "failed",
          errorMessage: sendRes.error ?? null,
          sentByUserId: options.triggeredByUserId ?? null,
        });

        if (sendRes.ok) {
          sentCount++;
          results.push({ semester: config.semester, status: "success", messageText: text });
        } else {
          failedCount++;
          results.push({
            semester: config.semester,
            status: "failed",
            error: sendRes.error || "Failed to deliver message.",
          });
        }
      }
    }
  }

  return {
    ok: failedCount === 0,
    briefType,
    dayName: DAYS[todayDayIndex],
    totalConfigured: configs.length,
    sentCount,
    skippedCount,
    failedCount,
    results,
  };
}
