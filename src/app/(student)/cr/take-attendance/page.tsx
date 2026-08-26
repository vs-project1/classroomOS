import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { studentProfiles, students, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { DailyAttendanceClient } from "./client-page";

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
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Morning Roll Call</h1>
      <DailyAttendanceClient roster={roster} semester={semesterStr} />
    </div>
  );
}
