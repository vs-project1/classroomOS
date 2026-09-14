"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  telegramSettings,
  semesterTelegramConfigs,
  telegramBroadcastLogs,
  weeklyRoutine,
  notices,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { getBotInfo, sendTelegramMessage } from "../services/telegram-client";
import {
  formatNoticeBroadcastMessage,
  formatRoutineBriefMessage,
  type RoutineSlotInfo,
} from "../services/formatters";
import { executeTelegramBrief } from "../services/telegram-brief-service";
import { areSemestersEqual } from "@/lib/utils/roman";
import {
  saveSemesterTelegramConfigSchema,
  saveTelegramSettingsSchema,
  type BroadcastNoticeInput,
  type BroadcastRoutineInput,
} from "../types";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Saves global Telegram bot credentials and default preferences.
 */
export async function saveTelegramSettingsAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth(["ADMIN"]);

  const rawWeekend = formData.getAll("weekendDays").map((v) => Number(v));
  const rawData = {
    botToken: (formData.get("botToken") as string) || "",
    isEnabled: formData.get("isEnabled") === "on" || formData.get("isEnabled") === "true",
    morningBriefTime: (formData.get("morningBriefTime") as string) || "05:30",
    eveningBriefTime: (formData.get("eveningBriefTime") as string) || "20:00",
    weekendDays: rawWeekend.length > 0 ? rawWeekend : [0, 6],
  };

  const parsed = saveTelegramSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Verify the bot token with Telegram
  const botInfo = await getBotInfo(parsed.data.botToken);
  if (!botInfo.ok || !botInfo.result) {
    return {
      success: false,
      error: botInfo.error || "Invalid Telegram Bot Token. Please verify with @BotFather.",
    };
  }

  const [existing] = await db.select().from(telegramSettings).limit(1);

  if (existing) {
    await db
      .update(telegramSettings)
      .set({
        botToken: parsed.data.botToken,
        botUsername: botInfo.result.username,
        isEnabled: parsed.data.isEnabled,
        morningBriefTime: parsed.data.morningBriefTime,
        eveningBriefTime: parsed.data.eveningBriefTime,
        weekendDays: parsed.data.weekendDays,
        updatedAt: new Date(),
      })
      .where(eq(telegramSettings.id, existing.id));
  } else {
    await db.insert(telegramSettings).values({
      id: crypto.randomUUID(),
      botToken: parsed.data.botToken,
      botUsername: botInfo.result.username,
      isEnabled: parsed.data.isEnabled,
      morningBriefTime: parsed.data.morningBriefTime,
      eveningBriefTime: parsed.data.eveningBriefTime,
      weekendDays: parsed.data.weekendDays,
      cronSecret: crypto.randomUUID(),
    });
  }

  revalidatePath("/admin/settings/telegram");
  revalidatePath("/profile");

  return {
    success: true,
    message: `Connected successfully as @${botInfo.result.username}!`,
  };
}

/**
 * Tests connection with a given Bot Token without saving.
 */
export async function testBotConnectionAction(botToken: string): Promise<ActionResult<{ username: string }>> {
  await requireAuth(["ADMIN"]);

  if (!botToken?.trim()) {
    return { success: false, error: "Please enter a Bot Token" };
  }

  const res = await getBotInfo(botToken.trim());
  if (!res.ok || !res.result) {
    return { success: false, error: res.error || "Failed to authenticate with Telegram" };
  }

  return {
    success: true,
    data: { username: res.result.username },
    message: `Token valid! Bot username: @${res.result.username}`,
  };
}

/**
 * Saves or updates a semester's Telegram chat / topic binding.
 */
export async function saveSemesterTelegramConfigAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  await requireAuth(["ADMIN"]);

  const rawData = {
    semester: formData.get("semester") as string,
    chatId: (formData.get("chatId") as string) || "",
    messageThreadId: formData.get("messageThreadId")
      ? Number(formData.get("messageThreadId"))
      : null,
    chatTitle: (formData.get("chatTitle") as string) || null,
    autoMorningBrief: formData.get("autoMorningBrief") === "on",
    autoEveningBrief: formData.get("autoEveningBrief") === "on",
    autoNotices: formData.get("autoNotices") === "on",
  };

  const parsed = saveSemesterTelegramConfigSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existing] = await db
    .select()
    .from(semesterTelegramConfigs)
    .where(eq(semesterTelegramConfigs.semester, parsed.data.semester))
    .limit(1);

  if (existing) {
    await db
      .update(semesterTelegramConfigs)
      .set({
        chatId: parsed.data.chatId,
        messageThreadId: parsed.data.messageThreadId ?? null,
        chatTitle: parsed.data.chatTitle ?? null,
        autoMorningBrief: parsed.data.autoMorningBrief,
        autoEveningBrief: parsed.data.autoEveningBrief,
        autoNotices: parsed.data.autoNotices,
        updatedAt: new Date(),
      })
      .where(eq(semesterTelegramConfigs.id, existing.id));
  } else {
    await db.insert(semesterTelegramConfigs).values({
      id: crypto.randomUUID(),
      semester: parsed.data.semester,
      chatId: parsed.data.chatId,
      messageThreadId: parsed.data.messageThreadId ?? null,
      chatTitle: parsed.data.chatTitle ?? null,
      autoMorningBrief: parsed.data.autoMorningBrief,
      autoEveningBrief: parsed.data.autoEveningBrief,
      autoNotices: parsed.data.autoNotices,
    });
  }

  revalidatePath("/admin/settings/telegram");
  return { success: true, message: `Semester ${parsed.data.semester} Telegram binding saved!` };
}

/**
 * Dispatches a test greeting message to a semester's Telegram channel.
 */
export async function sendTestTelegramMessageAction(semester: string): Promise<ActionResult> {
  const user = await requireAuth(["ADMIN"]);

  const [settings] = await db.select().from(telegramSettings).limit(1);
  if (!settings || !settings.botToken) {
    return { success: false, error: "Telegram Bot Token is not configured." };
  }

  const [config] = await db
    .select()
    .from(semesterTelegramConfigs)
    .where(eq(semesterTelegramConfigs.semester, semester))
    .limit(1);

  if (!config || !config.chatId) {
    return { success: false, error: `No Telegram Chat ID configured for Semester ${semester}.` };
  }

  const testText =
    `<b>Classroom OS — Test Broadcast</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎉 <b>Hello Semester ${semester}!</b>\n\n` +
    `This Telegram chat is now successfully connected to Classroom OS.\n` +
    `Routine changes, morning briefings, and campus announcements will be delivered here.\n\n` +
    `<i>Sent by ${user.name} via Admin Console</i>`;

  const sendResult = await sendTelegramMessage({
    token: settings.botToken,
    chatId: config.chatId,
    text: testText,
    messageThreadId: config.messageThreadId,
  });

  // Log dispatch
  await db.insert(telegramBroadcastLogs).values({
    id: crypto.randomUUID(),
    semester,
    type: "test_message",
    messageText: testText,
    status: sendResult.ok ? "success" : "failed",
    errorMessage: sendResult.error ?? null,
    sentByUserId: user.id,
  });

  revalidatePath("/admin/settings/telegram");

  if (!sendResult.ok) {
    return {
      success: false,
      error: sendResult.error || "Failed to send message. Make sure the bot is added as an Admin to the group/channel.",
    };
  }

  return { success: true, message: `Test message sent to Semester ${semester} successfully!` };
}

/**
 * Sends an instant test message to any arbitrary Telegram chat ID.
 * Allows quick verification of bot permissions and chat accessibility.
 */
export async function sendDirectTestMessageAction({
  chatId,
  botToken,
  customMessage,
  messageThreadId,
}: {
  chatId: string;
  botToken?: string;
  customMessage?: string;
  messageThreadId?: number | null;
}): Promise<ActionResult<{ messageId: number }>> {
  const user = await requireAuth(["ADMIN"]);

  let resolvedToken = botToken?.trim();
  if (!resolvedToken) {
    const [settings] = await db.select().from(telegramSettings).limit(1);
    resolvedToken = settings?.botToken;
  }

  if (!resolvedToken) {
    return { success: false, error: "Please provide a Bot Token or configure one first." };
  }

  if (!chatId?.trim()) {
    return { success: false, error: "Please enter a Telegram Chat ID." };
  }

  const text = customMessage?.trim() ||
    `<b>Classroom OS — Live Test Message</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎉 <b>Success!</b> Your Telegram bot is active and communicating with this chat.\n\n` +
    `<i>Triggered by ${user.name} via Admin Console</i>`;

  const sendResult = await sendTelegramMessage({
    token: resolvedToken,
    chatId: chatId.trim(),
    text,
    messageThreadId: messageThreadId ?? null,
  });

  // Log dispatch
  await db.insert(telegramBroadcastLogs).values({
    id: crypto.randomUUID(),
    semester: "TEST",
    type: "test_message",
    messageText: text,
    status: sendResult.ok ? "success" : "failed",
    errorMessage: sendResult.error ?? null,
    sentByUserId: user.id,
  });

  revalidatePath("/admin/settings/telegram");

  if (!sendResult.ok || !sendResult.messageId) {
    return {
      success: false,
      error: sendResult.error || "Failed to deliver message. Ensure the bot is added as an Admin to the group.",
    };
  }

  return {
    success: true,
    data: { messageId: sendResult.messageId },
    message: "Live test message delivered to Telegram successfully!",
  };
}

function normalizeSemesterToRoman(sem: string | number | null | undefined): string {
  if (!sem) return "I";
  const s = String(sem).trim().toUpperCase();
  const map: Record<string, string> = {
    "1": "I", "1ST": "I", "I": "I",
    "2": "II", "2ND": "II", "II": "II",
    "3": "III", "3RD": "III", "III": "III",
    "4": "IV", "4TH": "IV", "IV": "IV",
    "5": "V", "5TH": "V", "V": "V",
    "6": "VI", "6TH": "VI", "VI": "VI",
    "7": "VII", "7TH": "VII", "VII": "VII",
    "8": "VIII", "8TH": "VIII", "VIII": "VIII",
  };
  return map[s] || s;
}

/**
 * Manually broadcasts the routine for a semester to its linked Telegram channel.
 */
export async function broadcastRoutineToTelegramAction(
  input: BroadcastRoutineInput
): Promise<ActionResult> {
  const user = await requireAuth(["ADMIN", "CR", "TEACHER"]);

  const [settings] = await db.select().from(telegramSettings).limit(1);
  if (!settings || !settings.botToken || !settings.isEnabled) {
    return { success: false, error: "Telegram Bot is not configured or is currently disabled." };
  }

  const [config] = await db
    .select()
    .from(semesterTelegramConfigs)
    .where(eq(semesterTelegramConfigs.semester, input.semester))
    .limit(1);

  if (!config || !config.chatId) {
    return {
      success: false,
      error: `No Telegram chat configured for Semester ${input.semester}. Please configure it in Settings.`,
    };
  }

  // Calculate day and date in Asia/Kathmandu
  const now = new Date();
  const nptFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = nptFormatter.formatToParts(now);
  const hourPart = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const todayDayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort);

  // If after 18:00 (6 PM) and target day not explicitly set, default to tomorrow
  const targetDay = input.targetDayOfWeek !== undefined
    ? input.targetDayOfWeek
    : hourPart >= 18
    ? (todayDayIndex + 1) % 7
    : todayDayIndex;

  const targetDate = new Date(now);
  if (targetDay !== todayDayIndex) {
    const daysToAdd = (targetDay - todayDayIndex + 7) % 7;
    targetDate.setDate(targetDate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
  }

  // Fetch routine slots for that semester and day
  const rawRoutines = await db.query.weeklyRoutine.findMany({
    where: eq(weeklyRoutine.dayOfWeek, targetDay),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true },
      },
    },
  });

  const slots: RoutineSlotInfo[] = rawRoutines
    .filter((r) => areSemestersEqual(r.subject?.semester, input.semester))
    .map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
      subjectName: r.subject.name,
      teacherName: r.teacherName || r.subject.teacher?.name || null,
      room: r.room,
      notes: r.notes,
    }));

  const defaultTitle = targetDay === todayDayIndex ? "🌅 Today's Routine" : "🌙 Tomorrow's Routine";
  const titlePrefix = input.isUpdate ? "⚠️ Routine Changed Notice" : defaultTitle;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const customNoteToUse =
    input.customNote?.trim() ||
    (input.isUpdate ? "Timetable updated by administration. Please follow the revised schedule." : undefined);

  const text = formatRoutineBriefMessage({
    titlePrefix,
    semester: input.semester,
    date: targetDate,
    dayName: DAYS[targetDay],
    slots,
    customNote: customNoteToUse,
    appUrl,
  });

  const sendResult = await sendTelegramMessage({
    token: settings.botToken,
    chatId: config.chatId,
    text,
    messageThreadId: config.messageThreadId,
    pinMessage: input.pinMessage,
  });

  await db.insert(telegramBroadcastLogs).values({
    id: crypto.randomUUID(),
    semester: input.semester,
    type: "routine_broadcast",
    messageText: text,
    status: sendResult.ok ? "success" : "failed",
    errorMessage: sendResult.error ?? null,
    sentByUserId: user.id,
  });

  if (sendResult.ok) {
    // Clear the unpublished changes banner by updating lastRoutinePublishedAt
    await db
      .update(semesterTelegramConfigs)
      .set({
        lastRoutinePublishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(semesterTelegramConfigs.semester, input.semester));
  }

  revalidatePath("/admin/routine");
  revalidatePath("/routine");
  revalidatePath("/teacher/routine");
  revalidatePath("/admin/settings/telegram");

  if (!sendResult.ok) {
    return { success: false, error: sendResult.error || "Failed to broadcast routine to Telegram." };
  }

  return { success: true, message: `Routine broadcasted to Semester ${input.semester} Telegram group!` };
}

/**
 * Automatically records that a semester's timetable has been modified,
 * activating the "Publish Changes to Telegram" banner.
 */
export async function markSemesterRoutineModified(semester: string) {
  try {
    const normSem = normalizeSemesterToRoman(semester);
    const [existing] = await db
      .select()
      .from(semesterTelegramConfigs)
      .where(eq(semesterTelegramConfigs.semester, normSem))
      .limit(1);

    if (existing) {
      await db
        .update(semesterTelegramConfigs)
        .set({
          lastRoutineModifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(semesterTelegramConfigs.id, existing.id));
    } else {
      await db.insert(semesterTelegramConfigs).values({
        id: crypto.randomUUID(),
        semester: normSem,
        chatId: "",
        lastRoutineModifiedAt: new Date(),
      });
    }
  } catch (err) {
    console.error("[telegram] Failed to mark semester routine modified:", err);
  }
}

/**
 * Manually broadcasts an administrative notice to selected semester Telegram groups.
 */
export async function broadcastNoticeToTelegramAction(
  input: BroadcastNoticeInput
): Promise<ActionResult> {
  const user = await requireAuth(["ADMIN"]);

  const [settings] = await db.select().from(telegramSettings).limit(1);
  if (!settings || !settings.botToken || !settings.isEnabled) {
    return { success: false, error: "Telegram Bot is not configured or is currently disabled." };
  }

  const notice = await db.query.notices.findFirst({
    where: eq(notices.id, input.noticeId),
  });

  if (!notice) {
    return { success: false, error: "Notice not found." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const text = formatNoticeBroadcastMessage({
    title: notice.title,
    content: notice.content,
    isPinned: Boolean(notice.isPinned),
    expiresAt: notice.expiresAt,
    createdAt: notice.createdAt,
    appUrl,
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const semester of input.semesters) {
    const [config] = await db
      .select()
      .from(semesterTelegramConfigs)
      .where(eq(semesterTelegramConfigs.semester, semester))
      .limit(1);

    if (!config || !config.chatId) {
      errors.push(`Semester ${semester}: No Telegram chat configured`);
      continue;
    }

    const res = await sendTelegramMessage({
      token: settings.botToken,
      chatId: config.chatId,
      text,
      messageThreadId: config.messageThreadId,
      pinMessage: input.pinMessage,
    });

    await db.insert(telegramBroadcastLogs).values({
      id: crypto.randomUUID(),
      semester,
      type: "notice_broadcast",
      messageText: text,
      status: res.ok ? "success" : "failed",
      errorMessage: res.error ?? null,
      sentByUserId: user.id,
    });

    if (res.ok) {
      successCount++;
    } else {
      errors.push(`Semester ${semester}: ${res.error || "Failed to send"}`);
    }
  }

  revalidatePath("/admin/notices");
  revalidatePath("/admin/settings/telegram");

  if (successCount === 0) {
    return {
      success: false,
      error: `Failed to broadcast notice. ${errors.join(". ")}`,
    };
  }

  return {
    success: true,
    message: `Notice broadcasted to ${successCount} semester(s)!${
      errors.length > 0 ? ` (${errors.join("; ")})` : ""
    }`,
  };
}

/**
 * On-demand manual trigger for automated morning or evening routine briefings.
 * Allows administrators to test and verify briefings immediately from the UI.
 */
export async function triggerTelegramBriefAction({
  briefType,
  semester,
  force = true,
}: {
  briefType: "morning" | "evening";
  semester?: string;
  force?: boolean;
}): Promise<ActionResult<{ sentCount: number; failedCount: number; skippedCount: number; summary: string }>> {
  const user = await requireAuth(["ADMIN"]);

  const result = await executeTelegramBrief({
    briefType,
    semester,
    force,
    triggeredByUserId: user.id,
    source: "manual",
  });

  revalidatePath("/admin/settings/telegram");
  revalidatePath("/admin/routine");

  const summary = result.results
    .map(
      (r) =>
        `Sem ${r.semester}: ${
          r.status === "success"
            ? "Delivered"
            : r.status === "skipped"
            ? `Skipped (${r.reason})`
            : `Failed (${r.error})`
        }`
    )
    .join("; ");

  if (result.sentCount > 0) {
    return {
      success: true,
      data: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        skippedCount: result.skippedCount,
        summary,
      },
      message: `Briefing dispatched! ${result.sentCount} sent, ${result.skippedCount} skipped, ${result.failedCount} failed.`,
    };
  }

  if (result.failedCount > 0) {
    return {
      success: false,
      error: `Failed to deliver briefing. ${summary}`,
    };
  }

  return {
    success: true,
    data: {
      sentCount: 0,
      failedCount: 0,
      skippedCount: result.skippedCount,
      summary,
    },
    message: `Briefing skipped (${summary}).`,
  };
}
