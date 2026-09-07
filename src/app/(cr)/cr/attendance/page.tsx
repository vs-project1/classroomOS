import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { studentProfiles, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMonthlyAttendanceMatrixAction } from "@/features/attendance/actions/monthly";
import { MonthlyAttendanceMatrix } from "@/features/attendance/components/monthly-attendance-matrix";
import NepaliDate from "nepali-datetime";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CalendarCheck, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CRAttendancePage({
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
    semesterStr = `${semesterInt}${semesterInt === 1 ? "st" : semesterInt === 2 ? "nd" : semesterInt === 3 ? "rd" : "th"} Semester`;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Attendance Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Cohort attendance matrix and daily records for {semesterStr}.
          </p>
        </div>
        <Link
          href="/cr/take-attendance"
          className={buttonVariants({ className: "w-full sm:w-auto" })}
        >
          <CalendarCheck className="h-4 w-4 mr-2" /> Take Attendance
        </Link>
      </div>

      <MonthlyAttendanceMatrix
        initialData={initialData}
        currentSemester={semesterStr}
      />
    </div>
  );
}
