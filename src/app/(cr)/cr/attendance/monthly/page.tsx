import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { studentProfiles, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMonthlyAttendanceMatrixAction } from "@/features/attendance/actions/monthly";
import { MonthlyAttendanceMatrix } from "@/features/attendance/components/monthly-attendance-matrix";
import NepaliDate from "nepali-datetime";

export default async function CRMonthlyAttendancePage({
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
      semesterStr = `${semesterInt}${semesterInt === 1 ? "st" : semesterInt === 2 ? "nd" : semesterInt === 3 ? "rd" : "th"} Semester`;
    } else if (user.role === "TEACHER" && user.teacherId) {
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.id, user.teacherId),
      });
      semesterStr = teacher?.semesters?.[0] || "2nd Semester";
    } else {
      semesterStr = "2nd Semester";
    }
  }

  const now = new Date();
  const currentNepaliDate = new NepaliDate(now);
  const currentYear = currentNepaliDate.getYear();
  const currentMonthIndex = currentNepaliDate.getMonth();

  const initialData = await getMonthlyAttendanceMatrixAction(
    semesterStr,
    currentYear,
    currentMonthIndex
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <MonthlyAttendanceMatrix
        initialData={initialData}
        currentSemester={semesterStr}
      />
    </div>
  );
}
