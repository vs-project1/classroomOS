import { requireAuth } from "@/lib/auth/session";
import { resolveCurrentStudent } from "@/lib/auth";
import { db } from "@/db";
import { studentProfiles, students, teachers } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";
import { formatNepaliDate } from "@/lib/nepali-date";
import { getSemesterVariants, toOrdinalSemester } from "@/lib/utils/roman";

export default async function TakeDailyAttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string }>;
}) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const params = searchParams ? await searchParams : {};
  
  let semesterStr: string;
  if (user.role === "CR") {
    const crProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, user.id),
    });
    const student = !crProfile ? await resolveCurrentStudent() : null;
    const semesterVal = crProfile?.semester ?? student?.semester ?? 1;
    semesterStr = toOrdinalSemester(semesterVal);
  } else if (params.semester) {
    semesterStr = params.semester;
  } else if (user.role === "TEACHER" && user.teacherId) {
    const teacher = await db.query.teachers.findFirst({
      where: eq(teachers.id, user.teacherId),
    });
    semesterStr = teacher?.semesters?.[0] || "1st Semester";
  } else {
    semesterStr = "1st Semester";
  }
  
  const semVariants = getSemesterVariants(semesterStr);

  const roster = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber
  }).from(students)
    .where(semVariants.length > 0 ? inArray(students.semester, semVariants) : eq(students.semester, semesterStr))
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <DailyAttendanceClient 
        roster={roster} 
        semester={semesterStr}
        initialIsoDate={initialIsoDate}
        initialNepaliDate={nepaliDateStr}
        initialGregorianDate={gregorianDateStr}
      />
    </div>
  );
}
