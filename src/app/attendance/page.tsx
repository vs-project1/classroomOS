import { db } from "@/db";
import { attendance, classSessions, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveCurrentStudent } from "@/lib/auth";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/student/section-card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const student = await resolveCurrentStudent();
  
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Student Context Found</h2>
        <p className="text-muted-foreground">Please configure DEMO_STUDENT_ID or add students.</p>
      </div>
    );
  }

  // Fetch all attendance for this student with relations
  const records = await db.query.attendance.findMany({
    where: eq(attendance.studentId, student.id),
    with: {
      classSession: {
        with: {
          subject: true
        }
      }
    }
  });

  const totalClasses = records.length;
  const presentClasses = records.filter(r => r.status === 'present').length;
  const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  // Group by subject
  const subjectStats: Record<string, { name: string; total: number; present: number; code: string }> = {};

  for (const record of records) {
    const subj = record.classSession.subject;
    if (!subjectStats[subj.id]) {
      subjectStats[subj.id] = { name: subj.name, code: subj.code, total: 0, present: 0 };
    }
    subjectStats[subj.id].total++;
    if (record.status === 'present') {
      subjectStats[subj.id].present++;
    }
  }

  const subjectList = Object.values(subjectStats).map(stat => ({
    ...stat,
    percentage: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0
  })).sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight">Attendance Record</h2>
        <p className="text-muted-foreground mt-1">Track your class participation and requirements.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Overall Ring */}
        <SectionCard title="Overall Attendance" icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="md:col-span-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="72" className="stroke-muted fill-none stroke-[10]" />
                <circle 
                  cx="80" cy="80" r="72" 
                  className="stroke-primary fill-none stroke-[10] transition-all duration-1000 ease-out" 
                  strokeDasharray="452.39"
                  strokeDashoffset={452.39 - (452.39 * overallPercentage) / 100}
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{overallPercentage}%</span>
                <span className="text-sm font-medium text-muted-foreground mt-1">Attended</span>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">
              {totalClasses === 0 ? "No records yet." : `You have attended ${presentClasses} out of ${totalClasses} total classes.`}
            </p>
          </div>
        </SectionCard>

        {/* Subject Breakdown */}
        <SectionCard title="Subject Breakdown" className="md:col-span-2">
          {subjectList.length > 0 ? (
            <div className="space-y-6">
              {subjectList.map(subj => (
                <div key={subj.name} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      {subj.name} <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{subj.code}</span>
                    </span>
                    <span className="font-bold text-primary">{subj.percentage}%</span>
                  </div>
                  <Progress value={subj.percentage} className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${subj.percentage}%` }} />
                  </Progress>
                  <div className="text-xs text-muted-foreground text-right">
                    {subj.present} / {subj.total} Classes
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              No subjects have attendance recorded yet.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
