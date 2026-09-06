import { z } from "zod";

export const saveTelegramSettingsSchema = z.object({
  botToken: z.string().min(1, "Bot Token is required").trim(),
  isEnabled: z.boolean().default(true),
  morningBriefTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be in HH:MM format (e.g. 05:30)").default("05:30"),
  eveningBriefTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be in HH:MM format (e.g. 20:00)").default("20:00"),
  weekendDays: z.array(z.number().min(0).max(6)).default([0, 6]), // 0: Sunday, 6: Saturday
});

export type SaveTelegramSettingsInput = z.infer<typeof saveTelegramSettingsSchema>;

export const saveSemesterTelegramConfigSchema = z.object({
  semester: z.enum(["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]),
  chatId: z.string().min(1, "Chat / Channel ID is required").trim(),
  messageThreadId: z.coerce.number().optional().nullable(),
  chatTitle: z.string().optional().nullable(),
  autoMorningBrief: z.boolean().default(true),
  autoEveningBrief: z.boolean().default(true),
  autoNotices: z.boolean().default(true),
});

export type SaveSemesterTelegramConfigInput = z.infer<typeof saveSemesterTelegramConfigSchema>;

export const broadcastRoutineSchema = z.object({
  semester: z.enum(["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]),
  targetDayOfWeek: z.coerce.number().min(0).max(6).optional(), // Defaults to tomorrow or today based on context
  customNote: z.string().max(500).optional(),
  pinMessage: z.boolean().default(false),
  isUpdate: z.boolean().default(false),
});

export type BroadcastRoutineInput = z.infer<typeof broadcastRoutineSchema>;

export const broadcastNoticeSchema = z.object({
  noticeId: z.string().min(1, "Notice ID is required"),
  semesters: z.array(z.string()).min(1, "Select at least one semester"),
  pinMessage: z.boolean().default(false),
});

export type BroadcastNoticeInput = z.infer<typeof broadcastNoticeSchema>;

export type TelegramBotInfo = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
};

export type TelegramSendMessageResult = {
  ok: boolean;
  message_id?: number;
  description?: string;
};
