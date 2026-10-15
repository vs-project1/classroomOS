import { requireAuth } from "@/lib/auth/session";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getMonthlyAttendanceMatrixAction } from "@/features/attendance/actions/monthly";
import { MonthlyAttendanceMatrix } from "@/features/attendance/components/monthly-attendance-matrix";
import NepaliDate from "nepali-datetime";

export default async function AdminMonthlyAttendancePage() {
  await requireAuth(["ADMIN"]);

  // Fetch distinct semesters from students table
  const distinctSemesters = await db
    .selectDistinct({ semester: students.semester })
    .from(students);

  const availableSemesters = distinctSemesters
    .map((s) => (s.semester ? `Semester ${s.semester}` : null))
    .filter((s): s is string => Boolean(s));

  if (availableSemesters.length === 0) {
    availableSemesters.push("Semester 4", "Semester 2", "Semester 1");
  }

  const defaultSemester = availableSemesters[0] || "Semester 4";

  const now = new Date();
  const currentNepaliDate = new NepaliDate(now);
  const currentYear = currentNepaliDate.getYear();
  const currentMonthIndex = currentNepaliDate.getMonth();

  const initialData = await getMonthlyAttendanceMatrixAction(
    defaultSemester,
    currentYear,
    currentMonthIndex
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <MonthlyAttendanceMatrix
        initialData={initialData}
        availableSemesters={availableSemesters}
        currentSemester={defaultSemester}
      />
    </div>
  );
}
