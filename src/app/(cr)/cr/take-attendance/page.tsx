import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { studentProfiles, students, teachers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";
import { formatNepaliDate } from "@/lib/nepali-date";

export default async function TakeDailyAttendancePage({
  searchParams,
}: {
  searchParams?: Promise<{ semester?: string }>;
}) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const params = searchParams ? await searchParams : {};
  
  let semesterStr = params.semester;
  if (!semesterStr) {
    if (user.role === "CR") {
      const crProfile = await db.query.studentProfiles.findFirst({
        where: eq(studentProfiles.userId, user.id),
      });
      const semesterInt = crProfile?.semester || 2;
      semesterStr = `${semesterInt}${semesterInt === 1 ? 'st' : semesterInt === 2 ? 'nd' : semesterInt === 3 ? 'rd' : 'th'} Semester`;
    } else if (user.role === "TEACHER" && user.teacherId) {
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, user.teacherId),
      });
      semesterStr = teacher?.semesters?.[0] || "2nd Semester";
    } else {
      semesterStr = "2nd Semester";
    }
  }
  
  let roster = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber
  }).from(students)
    .where(eq(students.semester, semesterStr))
    .orderBy(asc(students.rollNumber));

  if (roster.length === 0) {
    roster = await db.select({
      id: students.id,
      name: students.name,
      rollNumber: students.rollNumber
    }).from(students)
      .orderBy(asc(students.rollNumber));
  }

  const now = new Date();
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
        initialNepaliDate={nepaliDateStr}
        initialGregorianDate={gregorianDateStr}
      />
    </div>
  );
}
