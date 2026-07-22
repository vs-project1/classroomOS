import { db } from "@/db";
import { weeklyRoutine, classSessions, homework, notices, events, attendance } from "@/db/schema";
import { desc, eq, and, gte, asc, sql } from "drizzle-orm";
import Link from "next/link";
import { resolveCurrentStudent } from "@/lib/auth";
import { formatTime12h } from "@/lib/time";
import { SectionCard } from "@/components/student/section-card";
import { StatCard } from "@/components/student/stat-card";
import { StatusChip } from "@/components/student/status-chip";
import { Clock, Book, Bell, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default async function StudentDashboard() {
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

  // Get Nepal Time
  const nptDateString = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'short' }).format(new Date());
  const nptDate = new Date(nptDateString);
  const dayOfWeek = nptDate.getDay();
  const nptTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const timestampNow = new Date().getTime();

  // Queries
  const todaysClasses = await db.query.weeklyRoutine.findMany({
    where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
    orderBy: [asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: { teacher: true }
      }
    }
  });

  const nextClass = todaysClasses.find(c => c.startTime >= nptTime) || todaysClasses[0] || null;

  const pendingHomeworkList = await db.query.homework.findMany({
    where: eq(homework.status, 'active'),
    orderBy: [asc(homework.dueDate)],
    limit: 3,
    with: { subject: true }
  });

  const latestNotices = await db.query.notices.findMany({
    orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
    limit: 2
  });
  const validNotices = latestNotices.filter(n => !n.expiresAt || n.expiresAt.getTime() > timestampNow);

  // Overall Attendance Calculation
  const attendanceRecords = await db.query.attendance.findMany({
    where: eq(attendance.studentId, student.id)
  });
  const totalClasses = attendanceRecords.length;
  const presentClasses = attendanceRecords.filter(a => a.status === 'present').length;
  const attendancePercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {student.name.split(' ')[0]} 👋</h2>
        <p className="text-muted-foreground">Here is what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        {/* Next Class - Hero Card */}
        <div className="md:col-span-2">
          <SectionCard 
            title="Next Class" 
            icon={<Clock className="w-5 h-5 text-primary" />}
            className="h-full bg-gradient-to-br from-primary/10 to-transparent border-primary/20"
          >
            {nextClass ? (
              <div className="flex flex-col h-full justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusChip status="upcoming" label="Starts Soon" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatTime12h(nextClass.startTime)} - {formatTime12h(nextClass.endTime)}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-primary">{nextClass.subject.name}</h3>
                  <p className="text-muted-foreground mt-1">
                    {nextClass.subject.teacher?.name || "No teacher assigned"} {nextClass.room && `• Room ${nextClass.room}`}
                  </p>
                </div>
                <div>
                  <Link href="/today" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full md:w-auto">
                    View Full Routine
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500/50" />
                <p>No more classes today! Enjoy your time off.</p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Overall Attendance */}
        <div>
          <SectionCard title="Attendance" icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="h-full">
            <div className="flex flex-col items-center justify-center h-full py-4 text-center">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="56" className="stroke-muted fill-none stroke-[8]" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    className="stroke-primary fill-none stroke-[8] transition-all duration-1000 ease-out" 
                    strokeDasharray="351.85"
                    strokeDashoffset={351.85 - (351.85 * attendancePercentage) / 100}
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{attendancePercentage}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {totalClasses === 0 ? "No records yet." : `You have attended ${presentClasses} out of ${totalClasses} classes.`}
              </p>
              <Link href="/attendance" className="text-primary text-sm font-medium hover:underline mt-4">
                View Subject Details &rarr;
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Pending Homework */}
        <SectionCard title="Pending Assignments" icon={<Book className="w-5 h-5 text-indigo-500" />}>
          {pendingHomeworkList.length > 0 ? (
            <div className="space-y-4">
              {pendingHomeworkList.map(hw => (
                <div key={hw.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="bg-indigo-100 text-indigo-700 p-2 rounded-md">
                    <Book className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm line-clamp-1" title={hw.title}>{hw.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{hw.subject.name}</p>
                    <div className="mt-2">
                      <StatusChip status="due_soon" label={`Due: ${new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(hw.dueDate)}`} />
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/homework" className="block text-center text-sm text-primary font-medium hover:underline pt-2">
                View all assignments
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">You're all caught up!</p>
          )}
        </SectionCard>

        {/* Notices */}
        <SectionCard title="Latest Notices" icon={<Bell className="w-5 h-5 text-amber-500" />}>
          {validNotices.length > 0 ? (
            <div className="space-y-4">
              {validNotices.map(notice => (
                <div key={notice.id} className="border-l-2 border-amber-500 pl-3 py-1">
                  <h4 className="font-semibold text-sm line-clamp-1">{notice.isPinned && "📌 "} {notice.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{notice.content}</p>
                </div>
              ))}
              <Link href="/notices" className="block text-center text-sm text-primary font-medium hover:underline pt-2">
                View notice board
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No new notices.</p>
          )}
        </SectionCard>

        {/* Today's Schedule Mini */}
        <SectionCard title="Today's Schedule" icon={<CalendarDays className="w-5 h-5 text-emerald-500" />}>
           {todaysClasses.length > 0 ? (
             <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
               {todaysClasses.map((cls, idx) => {
                 const isPast = cls.endTime < nptTime;
                 const isCurrent = cls.startTime <= nptTime && cls.endTime >= nptTime;
                 
                 return (
                  <div key={cls.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-background bg-border absolute left-0 md:left-1/2 -translate-x-1/2" />
                    <div className="w-[calc(100%-1rem)] md:w-[calc(50%-1.5rem)] pl-4 md:pl-0 flex flex-col">
                      <div className="flex items-center gap-2 md:justify-end md:group-even:justify-start">
                        <span className={cn("text-xs font-semibold", isPast ? "text-muted-foreground line-through" : (isCurrent ? "text-primary" : ""))}>
                          {formatTime12h(cls.startTime)}
                        </span>
                      </div>
                      <h4 className={cn("text-sm font-medium md:text-right md:group-even:text-left line-clamp-1", isPast ? "text-muted-foreground" : (isCurrent ? "text-primary" : ""))}>
                        {cls.subject.name}
                      </h4>
                    </div>
                  </div>
                 );
               })}
             </div>
           ) : (
             <p className="text-sm text-muted-foreground text-center py-6">No classes scheduled.</p>
           )}
        </SectionCard>
      </div>
    </div>
  );
}

// Utility className merge if not using tailwind-merge in scope
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
