import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, classSessions, attendance, enrollments, students } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Users, UserCheck, AlertCircle } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherRosterPage({ searchParams }: { searchParams: Promise<{ subjectId?: string }> }) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  
  if (!user.teacherId) {
    return (
      <div className="flex-1 space-y-6 max-w-5xl">
        <div className="p-5 bg-destructive/10 text-destructive-foreground rounded-2xl border border-destructive/20 text-sm font-medium">
          Your account is not linked to a teacher profile. Please contact an administrator.
        </div>
      </div>
    );
  }

  const { subjectId } = await searchParams;

  if (!subjectId) {
    return notFound();
  }

  // Verify the subject belongs to this teacher
  const subject = await db.query.subjects.findFirst({
    where: and(
      eq(subjects.id, subjectId),
      eq(subjects.teacherId, user.teacherId)
    )
  });

  if (!subject) {
    return notFound();
  }

  // Get total sessions for this subject
  const sessions = await db.query.classSessions.findMany({
    where: eq(classSessions.subjectId, subjectId)
  });
  const totalSessions = sessions.length;
  const sessionIds = sessions.map(s => s.id);

  // Get enrolled students
  const enrolled = await db
    .select({
      student: students,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId))
    .orderBy(students.rollNumber);

  // Get all attendance for these sessions
  let allAttendance: (typeof attendance.$inferSelect)[] = [];
  if (sessionIds.length > 0) {
    // Drizzle doesn't support 'in' well with empty arrays, but we checked length
    // Using a manual SQL query because inArray has issues sometimes
    const sessionIdsStr = sessionIds.map(id => `'${id}'`).join(',');
    allAttendance = await db.query.attendance.findMany({
      where: sql`class_session_id IN (${sql.raw(sessionIdsStr)})`
    });
  }

  // Compute metrics for each student
  const roster = enrolled.map(({ student }) => {
    const studentAttendance = allAttendance.filter(a => a.studentId === student.id);
    
    const attendedSessions = studentAttendance.filter(a => a.status === "present" || a.status === "late").length;
    const absentSessions = studentAttendance.filter(a => a.status === "absent").length;
    const excusedSessions = studentAttendance.filter(a => a.status === "excused").length;
    
    const percentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;
    
    return {
      student,
      attendedSessions,
      absentSessions,
      excusedSessions,
      percentage: Math.round(percentage * 10) / 10
    };
  });

  // Sort by lowest attendance first to highlight students at risk
  roster.sort((a, b) => a.percentage - b.percentage);

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link 
          href="/teacher/attendance"
          className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
            Attendance Roster
          </h1>
          <p className="text-muted-foreground mt-1">
            {subject.name} • {subject.code}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <Users className="w-4 h-4" />
            Total Enrolled
          </div>
          <div className="text-3xl font-bold font-fira-code">{roster.length}</div>
        </div>
        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <UserCheck className="w-4 h-4" />
            Sessions Recorded
          </div>
          <div className="text-3xl font-bold font-fira-code">{totalSessions}</div>
        </div>
        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <AlertCircle className="w-4 h-4" />
            Avg. Attendance
          </div>
          <div className="text-3xl font-bold font-fira-code">
            {roster.length > 0 ? Math.round(roster.reduce((acc, r) => acc + r.percentage, 0) / roster.length) : 0}%
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground font-medium border-b border-border/40">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Roll No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Student Name</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Attended</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Absent</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No students enrolled in this subject.
                  </td>
                </tr>
              ) : (
                roster.map((row) => (
                  <tr key={row.student.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-fira-code text-muted-foreground">
                      {row.student.rollNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {row.student.name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                        {row.attendedSessions}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.absentSessions > 0 ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                          {row.absentSessions}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-fira-code font-bold ${row.percentage < 80 ? 'text-destructive' : 'text-emerald-600'}`}>
                        {row.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
