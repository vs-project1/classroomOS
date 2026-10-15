import { cache } from "react";
import { db } from "@/db";
import {
  dailyAttendance,
  dailySessions,
  students,
  subjects,
  attendanceCorrectionRequests,
  classSessions,
  homework,
  lectureLogs,
  weeklyRoutine,
} from "@/db/schema";
import { eq, desc, and, inArray, count, gte, lte, or, lt, asc } from "drizzle-orm";
import { toSemesterNumber, toSemesterRoman } from "@/lib/semester";
import { calculateAttendanceMetrics } from "@/features/attendance/calculations/attendance-projection";

export interface StudentAttendanceResult {
  records: Array<{
    id: string;
    dailySessionId: string;
    studentId: string;
    status: string;
    createdAt: Date;
    date: Date;
    semester: number;
  }>;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  totalCount: number;
  attendedForMetrics: number;
  effectiveTotal: number;
  metrics: ReturnType<typeof calculateAttendanceMetrics>;
}

/**
 * Encapsulated query for a student's complete daily attendance history and TU 80% metrics.
 */
export const getStudentDailyAttendance = cache(async function getStudentDailyAttendance(
  studentId: string
): Promise<StudentAttendanceResult> {
  const records = await db
    .select({
      id: dailyAttendance.id,
      dailySessionId: dailyAttendance.dailySessionId,
      studentId: dailyAttendance.studentId,
      status: dailyAttendance.status,
      createdAt: dailyAttendance.createdAt,
      date: dailySessions.date,
      semester: dailySessions.semester,
    })
    .from(dailyAttendance)
    .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
    .where(eq(dailyAttendance.studentId, studentId))
    .orderBy(desc(dailySessions.date), desc(dailyAttendance.createdAt));

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const excusedCount = records.filter((r) => r.status === "excused").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const totalCount = records.length;

  const attendedForMetrics = presentCount + lateCount;
  const effectiveTotal = Math.max(attendedForMetrics, totalCount - excusedCount);

  const metrics = calculateAttendanceMetrics(
    attendedForMetrics,
    effectiveTotal,
    {
      late: lateCount,
      excused: excusedCount,
      absent: absentCount,
    },
    80
  );

  return {
    records,
    presentCount,
    lateCount,
    excusedCount,
    absentCount,
    totalCount,
    attendedForMetrics,
    effectiveTotal,
    metrics,
  };
});

/**
 * Encapsulated query for Teacher attendance overview: semesters taught, daily status, and pending disputes.
 */
export const getTeacherAttendanceSummary = cache(async function getTeacherAttendanceSummary(
  teacherId?: string | null,
  isAdmin: boolean = false
) {
  let teacherSubjects: Array<{ id: string; name: string; code: string; semester: number }> = [];
  if (teacherId) {
    const directSubjects = await db.query.subjects.findMany({
      where: and(eq(subjects.teacherId, teacherId), eq(subjects.isActive, true)),
    });
    const routineSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        semester: subjects.semester,
      })
      .from(weeklyRoutine)
      .innerJoin(subjects, eq(weeklyRoutine.subjectId, subjects.id))
      .where(and(eq(weeklyRoutine.teacherId, teacherId), eq(subjects.isActive, true)));

    const combined = [...directSubjects, ...routineSubjects];
    const seen = new Set<string>();
    teacherSubjects = combined.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  } else if (isAdmin) {
    teacherSubjects = await db.query.subjects.findMany({
      where: eq(subjects.isActive, true),
    });
  }

  const distinctSemesterNums = [...new Set(teacherSubjects.map((s) => s.semester).filter((s): s is number => s != null))].sort((a, b) => a - b);
  const distinctSemesters = distinctSemesterNums.map((s) => toSemesterRoman(s));

  // NPT start of today
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayStartNpt = new Date(`${ymd}T00:00:00Z`);

  let semesterSummaries: Array<{
    semester: string;
    enrolledCount: number;
    hasLoggedToday: boolean;
    todaySessionLogged: boolean;
    todaySessionId: string | null;
    subjectsCount: number;
  }> = [];

  if (distinctSemesterNums.length > 0) {
    const [allStudents, todaySessions] = await Promise.all([
      db
        .select({ semester: students.semester })
        .from(students)
        .where(inArray(students.semester, distinctSemesterNums)),
      db.query.dailySessions.findMany({
        where: and(
          inArray(dailySessions.semester, distinctSemesterNums),
          eq(dailySessions.date, todayStartNpt)
        ),
      }),
    ]);

    semesterSummaries = distinctSemesterNums.map((semNum) => {
      const romanSem = toSemesterRoman(semNum);
      const enrolledCount = allStudents.filter((st) => st.semester === semNum).length;
      const todaySession = todaySessions.find((sess) => sess.semester === semNum);
      const semesterSubjects = teacherSubjects.filter((s) => s.semester === semNum);

      return {
        semester: romanSem,
        enrolledCount,
        hasLoggedToday: Boolean(todaySession),
        todaySessionLogged: Boolean(todaySession),
        todaySessionId: todaySession?.id ?? null,
        subjectsCount: semesterSubjects.length,
      };
    });
  }

  const teacherSemesterNums = distinctSemesterNums;

  let pendingDisputes: Array<{
    id: string;
    attendanceId: string;
    studentId: string;
    requestedStatus: string;
    reason: string;
    status: string;
    reviewNote: string | null;
    createdAt: Date;
    studentName: string;
    studentRoll: string;
    studentRollNumber: string;
    studentSemester: number | string | null;
    sessionDate: Date;
    dailySemester: number | string;
    semester: number | string;
  }> = [];

  if (isAdmin || teacherSemesterNums.length > 0) {
    const disputeRows = await db
      .select({
        id: attendanceCorrectionRequests.id,
        attendanceId: attendanceCorrectionRequests.attendanceId,
        studentId: attendanceCorrectionRequests.studentId,
        requestedStatus: attendanceCorrectionRequests.requestedStatus,
        reason: attendanceCorrectionRequests.reason,
        status: attendanceCorrectionRequests.status,
        reviewNote: attendanceCorrectionRequests.reviewNote,
        createdAt: attendanceCorrectionRequests.createdAt,
        studentName: students.name,
        studentRoll: students.rollNumber,
        studentRollNumber: students.rollNumber,
        studentSemester: students.semester,
        sessionDate: dailySessions.date,
        dailySemester: dailySessions.semester,
        semester: dailySessions.semester,
      })
      .from(attendanceCorrectionRequests)
      .innerJoin(dailyAttendance, eq(attendanceCorrectionRequests.attendanceId, dailyAttendance.id))
      .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
      .innerJoin(students, eq(attendanceCorrectionRequests.studentId, students.id))
      .where(
        and(
          eq(attendanceCorrectionRequests.status, "pending"),
          isAdmin ? undefined : inArray(dailySessions.semester, teacherSemesterNums)
        )
      )
      .orderBy(desc(attendanceCorrectionRequests.createdAt));

    pendingDisputes = disputeRows;
  }

  return {
    distinctSemesters,
    semesterSummaries,
    pendingDisputes,
  };
});

/**
 * Encapsulated query for Semester attendance roster.
 */
export const getSemesterRosterAttendance = cache(async function getSemesterRosterAttendance(
  semester: string | number
) {
  const semNum = toSemesterNumber(semester);

  const studentList = await db
    .select({
      id: students.id,
      name: students.name,
      rollNumber: students.rollNumber,
      semester: students.semester,
      email: students.email,
    })
    .from(students)
    .where(eq(students.semester, semNum))
    .orderBy(asc(students.rollNumber));

  const allSessions = await db.query.dailySessions.findMany({
    where: eq(dailySessions.semester, semNum),
    orderBy: [desc(dailySessions.date)],
  });

  const sessionIds = allSessions.map((s) => s.id);

  let allAttendanceRecords: Array<{
    id: string;
    dailySessionId: string;
    studentId: string;
    status: string;
  }> = [];

  if (sessionIds.length > 0) {
    allAttendanceRecords = await db.query.dailyAttendance.findMany({
      where: inArray(dailyAttendance.dailySessionId, sessionIds),
    });
  }

  const attendanceByStudent = new Map<string, typeof allAttendanceRecords>();
  for (const record of allAttendanceRecords) {
    const list = attendanceByStudent.get(record.studentId) ?? [];
    list.push(record);
    attendanceByStudent.set(record.studentId, list);
  }

  const totalSessionsLogged = allSessions.length;

  const roster = studentList.map((st) => {
    const records = attendanceByStudent.get(st.id) ?? [];
    const presentDays = records.filter((r) => r.status === "present").length;
    const lateDays = records.filter((r) => r.status === "late").length;
    const excusedDays = records.filter((r) => r.status === "excused").length;
    const absentDays = records.filter((r) => r.status === "absent").length;

    const attendedDays = presentDays + lateDays;
    const effectiveTotalDays = Math.max(attendedDays, totalSessionsLogged - excusedDays);
    const percentage =
      effectiveTotalDays > 0 ? Math.round((attendedDays / effectiveTotalDays) * 100) : 100;

    return {
      student: st,
      totalSessionsLogged,
      presentDays,
      lateDays,
      excusedDays,
      absentDays,
      attendedDays,
      percentage,
      isShortage: percentage < 80,
    };
  });

  const totalStudents = roster.length;
  const avgAttendancePercentage =
    totalStudents > 0
      ? Math.round(roster.reduce((acc, r) => acc + r.percentage, 0) / totalStudents)
      : 100;

  return {
    roster,
    totalStudents,
    totalSessionsLogged,
    avgAttendancePercentage,
    allSessions,
  };
});

/**
 * Encapsulated query for missed classes catch-up journal.
 */
export const getStudentMissedDaysJournal = cache(async function getStudentMissedDaysJournal(
  studentId: string,
  allowedSubjectIds: string[]
) {
  const missedRecords = await db
    .select({
      id: dailyAttendance.id,
      status: dailyAttendance.status,
      date: dailySessions.date,
      semester: dailySessions.semester,
    })
    .from(dailyAttendance)
    .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
    .where(
      and(
        eq(dailyAttendance.studentId, studentId),
        inArray(dailyAttendance.status, ["absent", "late"])
      )
    )
    .orderBy(desc(dailySessions.date));

  let sessions: Array<{
    id: string;
    subjectId: string;
    routineId: string | null;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    createdAt: Date;
    subject: {
      id: string;
      name: string;
      code: string;
      slug: string;
      semester: number;
      teacherId: string | null;
    };
    lectureLog: {
      topicsCovered: string;
      notes: string | null;
      homework: string | null;
    } | null;
  }> = [];

  let linkedHomework: Array<{
    id: string;
    subjectId: string;
    sessionId: string | null;
    title: string;
    description: string | null;
    dueDate: Date;
    status: string;
  }> = [];

  if (missedRecords.length > 0) {
    const dateKeys = Array.from(
      new Set(
        missedRecords.map((r) =>
          new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date(r.date))
        )
      )
    );

    const dayConditions = dateKeys.map((k) => {
      const start = new Date(`${k}T00:00:00.000Z`);
      const end = new Date(`${k}T23:59:59.999Z`);
      return and(gte(classSessions.sessionDate, start), lte(classSessions.sessionDate, end));
    });

    const sessionWhere = and(
      allowedSubjectIds.length > 0 ? inArray(classSessions.subjectId, allowedSubjectIds) : undefined,
      dayConditions.length > 0 ? or(...dayConditions) : undefined
    );

    sessions = await db.query.classSessions.findMany({
      where: sessionWhere,
      with: {
        subject: true,
        lectureLog: true,
      },
      orderBy: [desc(classSessions.sessionDate), asc(classSessions.startTime)],
    });

    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      linkedHomework = await db.query.homework.findMany({
        where: inArray(homework.sessionId, sessionIds),
      });
    }
  }

  const sessionsByDateKey = new Map<string, typeof sessions>();
  for (const sess of sessions) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(
      new Date(sess.sessionDate)
    );
    const list = sessionsByDateKey.get(key) ?? [];
    list.push(sess);
    sessionsByDateKey.set(key, list);
  }

  const homeworkBySession = new Map<string, typeof linkedHomework>();
  for (const hw of linkedHomework) {
    if (!hw.sessionId) continue;
    const list = homeworkBySession.get(hw.sessionId) ?? [];
    list.push(hw);
    homeworkBySession.set(hw.sessionId, list);
  }

  return {
    missedRecords,
    sessionsByDateKey,
    homeworkBySession,
  };
});

