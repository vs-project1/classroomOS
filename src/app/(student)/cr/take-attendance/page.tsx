import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { studentProfiles, students } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";
import { formatNepaliDate } from "@/lib/nepali-date";

export default async function TakeDailyAttendancePage() {
  const user = await requireAuth(["CR"]);
  
  // Get CR's semester
  const crProfile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, user.id)
  });
  
  const semesterInt = crProfile?.semester || 1;
  const semesterStr = `${semesterInt}${semesterInt === 1 ? 'st' : semesterInt === 2 ? 'nd' : semesterInt === 3 ? 'rd' : 'th'} Semester`;
  
  const roster = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber
  }).from(students)
    .where(eq(students.semester, semesterStr))
    .orderBy(asc(students.rollNumber));

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
