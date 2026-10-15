import { db } from "@/db";
import { weeklyRoutine, homework, notices, events, classSessions } from "@/db/schema";
import { asc, desc, eq, gte } from "drizzle-orm";
import { nptStartOfDay, getNptDayOfWeek } from "@/lib/timezone";

export async function getAdminDashboardData() {
  const dayOfWeek = getNptDayOfWeek();
  const todayStartNpt = nptStartOfDay();
  const timestampNow = Date.now();
  const nptTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  const [
    todaysClasses,
    latestHomeworkList,
    latestNotices,
    upcomingEvents,
    recentSessions,
    activeHomeworkCount,
    noticesCount,
  ] = await Promise.all([
    db.query.weeklyRoutine.findMany({
      where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      orderBy: [asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true },
        },
      },
    }),
    db.query.homework.findMany({
      where: eq(homework.status, "active"),
      orderBy: [asc(homework.dueDate)],
      limit: 1,
      with: { subject: true },
    }),
    db.query.notices.findMany({
      orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
      limit: 1,
    }),
    db.query.events.findMany({
      where: gte(events.eventDate, todayStartNpt),
      orderBy: [asc(events.eventDate), asc(events.startTime)],
      limit: 1,
    }),
    db.query.classSessions.findMany({
      orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
      limit: 1,
      with: { subject: true },
    }),
    db.$count(homework, eq(homework.status, "active")),
    db.$count(notices),
  ]);

  return {
    todaysClasses,
    latestHomework: latestHomeworkList[0] || null,
    latestNotice: latestNotices.find((n) => !n.expiresAt || n.expiresAt.getTime() > timestampNow) || null,
    upcomingEvent: upcomingEvents[0] || null,
    recentSession: recentSessions[0] || null,
    activeHomeworkCount,
    noticesCount,
    nptTime,
  };
}
