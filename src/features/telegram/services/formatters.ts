import { formatNepaliDate } from "@/lib/nepali-date";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type RoutineSlotInfo = {
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName?: string | null;
  room?: string | null;
  notes?: string | null;
};

export function formatRoutineBriefMessage({
  titlePrefix,
  semester,
  date,
  dayName,
  slots,
  customNote,
  appUrl,
}: {
  titlePrefix: string;
  semester: string;
  date: Date;
  dayName: string;
  slots: RoutineSlotInfo[];
  customNote?: string | null;
  appUrl?: string;
}): string {
  const nepaliDateStr = formatNepaliDate(date, "YYYY MMMM DD");
  const gregDateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kathmandu",
  }).format(date);

  let msg = `<b>${titlePrefix} — Semester ${escapeHtml(semester)}</b>\n`;
  msg += `🗓️ <b>${escapeHtml(dayName)}</b>, ${escapeHtml(nepaliDateStr)} (${escapeHtml(gregDateStr)})\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (slots.length === 0) {
    msg += `🎉 <i>No classes scheduled! Enjoy your day off.</i>\n\n`;
  } else {
    slots.forEach((slot, index) => {
      msg += `⏰ <b>${escapeHtml(slot.startTime)} - ${escapeHtml(slot.endTime)}</b>\n`;
      msg += `📚 <b>${escapeHtml(slot.subjectName)}</b>\n`;
      const meta: string[] = [];
      if (slot.teacherName?.trim()) meta.push(`👨‍🏫 ${escapeHtml(slot.teacherName)}`);
      if (slot.room?.trim()) meta.push(`📍 ${escapeHtml(slot.room)}`);
      if (meta.length > 0) {
        msg += `   ${meta.join(" • ")}\n`;
      }
      if (slot.notes?.trim()) {
        msg += `   💡 <i>${escapeHtml(slot.notes)}</i>\n`;
      }
      if (index < slots.length - 1) msg += `\n`;
    });
    msg += `\n`;
  }

  if (customNote?.trim()) {
    msg += `💬 <b>Announcement:</b>\n<i>${escapeHtml(customNote)}</i>\n\n`;
  }

  const routineUrl = appUrl ? `${appUrl}/routine?semester=${encodeURIComponent(semester)}` : "/routine";
  msg += `🔗 <a href="${routineUrl}">Open Timetable on Classroom OS</a>`;

  return msg;
}

export function formatNoticeBroadcastMessage({
  title,
  content,
  isPinned,
  expiresAt,
  createdAt,
  appUrl,
}: {
  title: string;
  content: string;
  isPinned: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  appUrl?: string;
}): string {
  const nepaliDateStr = formatNepaliDate(createdAt, "YYYY MMMM DD");

  let msg = isPinned
    ? `📌 <b>HIGH PRIORITY CAMPUS ALERT</b>\n`
    : `📢 <b>Official Campus Notice</b>\n`;
  msg += `🗓️ ${escapeHtml(nepaliDateStr)}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `<b>${escapeHtml(title)}</b>\n\n`;
  msg += `${escapeHtml(content)}\n\n`;

  if (expiresAt) {
    msg += `⏳ <i>Valid until: ${escapeHtml(formatNepaliDate(expiresAt, "YYYY MMMM DD"))}</i>\n\n`;
  }

  const noticesUrl = appUrl ? `${appUrl}/admin/notices` : "/notices";
  msg += `🔗 <a href="${noticesUrl}">View Notice on Classroom OS</a>`;

  return msg;
}

export function formatWeekendGreetingMessage({
  type,
  semester,
}: {
  type: "friday_wrap" | "sunday_kickoff_preview";
  semester: string;
}): string {
  if (type === "friday_wrap") {
    return `🎉 <b>Happy Weekend — Semester ${escapeHtml(semester)}!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Classes are done for the week! Saturday and Sunday are off. 🏖️\n\n` +
      `Rest well, catch up on pending homework, and we'll see you on Monday morning!\n\n` +
      `<i>Classroom OS Bot</i>`;
  }

  return `🌅 <b>Sunday Evening Check-in — Semester ${escapeHtml(semester)}!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Hope you had a restful weekend! Classes resume tomorrow (Monday) morning.\n` +
    `Check your bags, alarms, and assignments tonight. 🚀\n\n` +
    `<i>Tomorrow morning's routine will be posted at 5:30 AM.</i>`;
}
