import { requireAuth } from "@/lib/auth/session";
import { resolveCurrentStudent } from "@/lib/auth";
import { db } from "@/db";
import { students, teachers, dailySessions, dailyAttendance, users } from "@/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";
import { formatNepaliDate } from "@/lib/nepali-date";
import { toOrdinalSemester, parseSemesterNumber } from "@/lib/utils/roman";

export default async function TakeDailyAttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string; section?: string }>;
}) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const params = searchParams ? await searchParams : {};
  
  const student = await resolveCurrentStudent();
  let semesterVal = 2;
  let semesterStr: string;
  if (user.role === "CR") {
    semesterVal = student?.semester ?? 2;
    semesterStr = toOrdinalSemester(semesterVal);
  } else if (params.semester) {
    semesterStr = params.semester;
    semesterVal = parseSemesterNumber(semesterStr) ?? 2;
  } else if (user.role === "TEACHER" && user.teacherId) {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, user.teacherId),
    });
    semesterStr = teacher?.semesters?.[0] || "2nd Semester";
    semesterVal = parseSemesterNumber(semesterStr) ?? 2;
  } else {
    semesterStr = "2nd Semester";
    semesterVal = 2;
  }

  // Section handling: CR restricted to own cohort section; Teachers and Admins can switch
  let sectionVal = "A";
  if (user.role === "CR") {
    sectionVal = student?.section || "A";
  } else if (params.section) {
    sectionVal = params.section.toUpperCase();
  } else {
    sectionVal = "A";
  }

  // Query distinct sections available in this semester
  const distinctSections = await db
    .selectDistinct({ section: students.section })
    .from(students)
    .where(eq(students.semester, semesterVal));
  const availableSections = distinctSections.map((s) => s.section).filter(Boolean).sort();
  
  const roster = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber
  }).from(students)
    .where(and(eq(students.semester, semesterVal), eq(students.section, sectionVal)))
    .orderBy(asc(students.rollNumber));

  const now = new Date();
  const initialIsoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const nepaliDateStr = formatNepaliDate(now, 'dddd, YYYY MMMM DD');
  const gregorianDateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);

  // Pre-fetch existing session on server for initialIsoDate to prevent client loading spinner waterfall
  const [y, m, d] = initialIsoDate.split("-").map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const existingSession = await db.query.dailySessions.findFirst({
    where: and(
      eq(dailySessions.semester, semesterVal),
      eq(dailySessions.section, sectionVal),
      eq(dailySessions.date, targetDate)
    ),
  });

  const initialAttendance: Record<string, "present" | "absent" | "late" | "excused"> = {};
  for (const s of roster) {
    initialAttendance[s.id] = "present";
  }

  let initialExistingSession: { id: string; markedByName: string } | null = null;
  if (existingSession) {
    let markerName = "CR";
    if (existingSession.markedBy) {
      const markerUser = await db.query.users.findFirst({
        where: eq(users.id, existingSession.markedBy),
      });
      if (markerUser?.role === "CR") {
        const markerStudent = await db.query.students.findFirst({
          where: eq(students.userId, markerUser.id),
        });
        markerName = markerStudent?.name || "CR";
      } else if (markerUser?.role === "TEACHER") {
        const markerTeacher = await db.query.teachers.findFirst({
          where: eq(teachers.userId, markerUser.id),
        });
        markerName = markerTeacher?.name || "Teacher";
      } else if (markerUser?.role === "ADMIN") {
        markerName = "Admin";
      }
    }
    initialExistingSession = {
      id: existingSession.id,
      markedByName: markerName,
    };

    const savedRecords = await db.select().from(dailyAttendance)
      .where(eq(dailyAttendance.dailySessionId, existingSession.id));
    for (const r of savedRecords) {
      initialAttendance[r.studentId] = r.status as "present" | "absent" | "late" | "excused";
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-12">
      <DailyAttendanceClient 
        roster={roster} 
        semester={semesterStr}
        section={sectionVal}
        availableSections={availableSections.length > 0 ? availableSections : ["A"]}
        userRole={user.role}
        initialIsoDate={initialIsoDate}
        maxDate={initialIsoDate}
        initialNepaliDate={nepaliDateStr}
        initialGregorianDate={gregorianDateStr}
        initialAttendance={initialAttendance}
        initialExistingSession={initialExistingSession}
      />
    </div>
  );
}
