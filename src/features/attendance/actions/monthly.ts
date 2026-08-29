"use server";

import { db } from "@/db";
import { dailySessions, dailyAttendance, students } from "@/db/schema";
import { eq, and, asc, gte, lte, inArray } from "drizzle-orm";
import NepaliDate from "nepali-datetime";
import { requireAuth } from "@/lib/auth/session";

export interface MonthlyAttendanceDay {
  dayNumber: number;
  nepaliDateStr: string;
  epochStart: number;
  dayOfWeek: string;
  isWeekend: boolean;
  hasSession: boolean;
}

export interface StudentAttendanceSummary {
  id: string;
  name: string;
  rollNumber: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  percentage: number;
  records: Record<number, "present" | "absent" | "late" | "excused">;
}

export interface MonthlyAttendanceMatrixResult {
  year: number;
  monthIndex: number;
  monthName: string;
  semester: string;
  days: MonthlyAttendanceDay[];
  students: StudentAttendanceSummary[];
  stats: {
    totalStudents: number;
    totalSessions: number;
    overallAttendancePct: number;
  };
}

const NEPALI_MONTH_NAMES = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

export async function getMonthlyAttendanceMatrixAction(
  semester: string,
  year: number = 2083,
  monthIndex: number = 1
): Promise<MonthlyAttendanceMatrixResult> {
  await requireAuth(["CR", "ADMIN", "TEACHER"]);

  // 1. Fetch all students for the semester
  const studentList = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber,
  }).from(students)
    .where(eq(students.semester, semester))
    .orderBy(asc(students.rollNumber));

  // 2. Generate all days in the Nepali month
  const days: MonthlyAttendanceDay[] = [];
  for (let d = 1; d <= 32; d++) {
    try {
      const nd = new NepaliDate(year, monthIndex, d);
      if (nd.getMonth() === monthIndex) {
        const jsDate = nd.getDateObject();
        const ymd = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kathmandu",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(jsDate);
        const epochStart = Math.floor(new Date(`${ymd}T00:00:00Z`).getTime() / 1000);

        const weekday = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kathmandu",
          weekday: "short",
        }).format(jsDate);

        days.push({
          dayNumber: d,
          nepaliDateStr: nd.format("YYYY-MM-DD"),
          epochStart,
          dayOfWeek: weekday,
          isWeekend: weekday === "Sat",
          hasSession: false,
        });
      }
    } catch {
      // Month boundary reached
    }
  }

  if (days.length === 0) {
    return {
      year,
      monthIndex,
      monthName: NEPALI_MONTH_NAMES[monthIndex] || "Unknown",
      semester,
      days: [],
      students: [],
      stats: { totalStudents: 0, totalSessions: 0, overallAttendancePct: 0 },
    };
  }

  const startEpoch = days[0].epochStart;
  const endEpoch = days[days.length - 1].epochStart + 86400;

  // 3. Query all daily_sessions in this date range for this semester
  const sessions = await db.select().from(dailySessions)
    .where(
      and(
        eq(dailySessions.semester, semester),
        gte(dailySessions.date, new Date(startEpoch * 1000)),
        lte(dailySessions.date, new Date(endEpoch * 1000))
      )
    );

  const sessionIds = sessions.map((s) => s.id);
  const sessionByDayMap = new Map<number, typeof sessions[0]>();

  for (const session of sessions) {
    const sDate = new Date(session.date);
    const nd = new NepaliDate(sDate);
    if (nd.getMonth() === monthIndex && nd.getYear() === year) {
      const dayNum = nd.getDate();
      sessionByDayMap.set(dayNum, session);
      const targetDay = days.find((d) => d.dayNumber === dayNum);
      if (targetDay) targetDay.hasSession = true;
    }
  }

  // 4. Query all daily_attendance rows for these sessions
  let attendanceRows: Array<typeof dailyAttendance.$inferSelect> = [];
  if (sessionIds.length > 0) {
    attendanceRows = await db.select().from(dailyAttendance)
      .where(inArray(dailyAttendance.dailySessionId, sessionIds));
  }

  const attendanceLookup = new Map<string, "present" | "absent" | "late" | "excused">();
  for (const row of attendanceRows) {
    attendanceLookup.set(`${row.dailySessionId}_${row.studentId}`, row.status as any);
  }

  // 5. Aggregate per student
  const totalSessionsCount = sessions.length;
  let aggregateTotalPresent = 0;
  let aggregateTotalPossible = 0;

  const studentsSummary: StudentAttendanceSummary[] = studentList.map((std) => {
    const records: Record<number, "present" | "absent" | "late" | "excused"> = {};
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    for (const [dayNum, session] of sessionByDayMap.entries()) {
      const status = attendanceLookup.get(`${session.id}_${std.id}`) || "present";
      records[dayNum] = status;

      if (status === "present") presentCount++;
      else if (status === "absent") absentCount++;
      else if (status === "late") lateCount++;
      else if (status === "excused") excusedCount++;
    }

    const attended = presentCount + lateCount;
    const effectiveTotal = Math.max(attended, totalSessionsCount - excusedCount);
    const percentage = effectiveTotal > 0 ? Math.round((attended / effectiveTotal) * 100) : 100;

    aggregateTotalPresent += attended;
    aggregateTotalPossible += effectiveTotal;

    return {
      id: std.id,
      name: std.name,
      rollNumber: std.rollNumber,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      percentage,
      records,
    };
  });

  const overallAttendancePct = aggregateTotalPossible > 0
    ? Math.round((aggregateTotalPresent / aggregateTotalPossible) * 100)
    : 100;

  return {
    year,
    monthIndex,
    monthName: NEPALI_MONTH_NAMES[monthIndex] || "Unknown",
    semester,
    days,
    students: studentsSummary,
    stats: {
      totalStudents: studentList.length,
      totalSessions: totalSessionsCount,
      overallAttendancePct,
    },
  };
}
