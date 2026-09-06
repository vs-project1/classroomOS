import { NextResponse } from "next/server";
import crypto from "crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  telegramSettings,
  semesterTelegramConfigs,
  telegramBroadcastLogs,
  weeklyRoutine,
} from "@/db/schema";
import { sendTelegramMessage } from "@/features/telegram/services/telegram-client";
import {
  formatRoutineBriefMessage,
  formatWeekendGreetingMessage,
  type RoutineSlotInfo,
} from "@/features/telegram/services/formatters";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function handleTelegramBrief(request: Request) {
  // 1. Authenticate cron trigger
  const [settings] = await db.select().from(telegramSettings).limit(1);
  if (!settings || !settings.botToken || !settings.isEnabled) {
    return NextResponse.json({ ok: false, error: "Telegram Bot is not configured or is disabled." }, { status: 200 });
  }

  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "")?.trim();
  const validSecret = process.env.CRON_SECRET || settings.cronSecret;

  if (validSecret && providedSecret !== validSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Invalid cron secret." }, { status: 401 });
  }

  // 2. Determine time in Nepal (Asia/Kathmandu)
  const now = new Date();
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type"); // "morning" | "evening" | null

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

  const briefType = typeParam === "morning" || typeParam === "evening"
    ? typeParam
    : hour < 12 ? "morning" : "evening";

  const weekendDays: number[] = settings.weekendDays || [0, 6]; // 0: Sunday, 6: Saturday
  const isTodayWeekend = weekendDays.includes(todayDayIndex);

  const configs = await db.select().from(semesterTelegramConfigs);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const results: any[] = [];

  // 3. Morning Routine Execution
  if (briefType === "morning") {
    // If today is weekend (e.g. Saturday or Sunday), skip morning routine alarm
    if (isTodayWeekend) {
      return NextResponse.json({
        ok: true,
        type: "morning",
        status: "skipped",
        reason: `Today is ${DAYS[todayDayIndex]} (Weekend). No morning routine broadcast.`,
      });
    }

    // Fetch all routine slots for today
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
      if (!config.chatId || !config.autoMorningBrief) continue;

      const slots: RoutineSlotInfo[] = todayRoutines
        .filter((r) => {
          const subSem = r.subject?.semester?.toUpperCase();
          return subSem === config.semester || subSem?.startsWith(config.semester);
        })
        .map((r) => ({
          startTime: r.startTime,
          endTime: r.endTime,
          subjectName: r.subject.name,
          teacherName: r.teacherName || r.subject.teacher?.name || null,
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
      });

      results.push({ semester: config.semester, ok: sendRes.ok });
    }
  } else {
    // 4. Evening Next-Day Briefing Execution
    const tomorrowDayIndex = (todayDayIndex + 1) % 7;
    const isTomorrowWeekend = weekendDays.includes(tomorrowDayIndex);

    // Case A: Today is Friday evening (tomorrow is Saturday - start of weekend)
    if (isTomorrowWeekend && !isTodayWeekend) {
      for (const config of configs) {
        if (!config.chatId || !config.autoEveningBrief) continue;

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
        });

        results.push({ semester: config.semester, type: "friday_wrap", ok: sendRes.ok });
      }
    } else if (todayDayIndex === 6) {
      // Case B: Saturday evening -> still weekend, keep quiet
      return NextResponse.json({
        ok: true,
        type: "evening",
        status: "skipped",
        reason: "Saturday night (weekend). Kept silent.",
      });
    } else {
      // Case C: Regular class day OR Sunday night (prepping for Monday morning!)
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
        if (!config.chatId || !config.autoEveningBrief) continue;

        const slots: RoutineSlotInfo[] = tomorrowRoutines
          .filter((r) => {
            const subSem = r.subject?.semester?.toUpperCase();
            return subSem === config.semester || subSem?.startsWith(config.semester);
          })
          .map((r) => ({
            startTime: r.startTime,
            endTime: r.endTime,
            subjectName: r.subject.name,
            teacherName: r.teacherName || r.subject.teacher?.name || null,
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
        });

        results.push({ semester: config.semester, ok: sendRes.ok });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    type: briefType,
    day: DAYS[todayDayIndex],
    results,
  });
}

export async function GET(request: Request) {
  return handleTelegramBrief(request);
}

export async function POST(request: Request) {
  return handleTelegramBrief(request);
}
