import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { studentProfiles, students, teachers } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";
import { formatNepaliDate } from "@/lib/nepali-date";

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
    const semesterInt = crProfile?.semester || 1;
    semesterStr = `${semesterInt}${semesterInt === 1 ? 'st' : semesterInt === 2 ? 'nd' : semesterInt === 3 ? 'rd' : 'th'} Semester`;
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
  
  const shortSem = semesterStr.replace(/ Semester/i, "").trim();
  const fullSem = shortSem.toLowerCase().includes("sem") ? shortSem : `${shortSem} Semester`;

  const roster = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber
  }).from(students)
    .where(inArray(students.semester, [semesterStr, shortSem, fullSem]))
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
