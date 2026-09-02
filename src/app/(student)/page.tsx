import { db } from "@/db";
import { weeklyRoutine, homework, notices, attendance, dailyAttendance } from "@/db/schema";
import { desc, eq, asc } from "drizzle-orm";
import Link from "next/link";
import { resolveCurrentStudent } from "@/lib/auth";
import { formatTime12h } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { calculateAttendanceMetrics } from "@/features/attendance/calculations/attendance-projection";
import { ArcGauge } from "@/components/attendance/arc-gauge";
import { Book, Bell, CalendarDays, CheckCircle2, AlertCircle, ArrowRight, Laptop, Lock, AlertTriangle } from "lucide-react";

import { RecentResourcesWidget } from "@/features/resources/components/recent-resources-widget";

import { getCurrentUser } from "@/lib/auth";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

export default async function StudentDashboard() {
  const user = await getCurrentUser();
  if (user?.role === "TEACHER") {
    const { redirect } = await import("next/navigation");
    redirect("/teacher");
  }
  if (user?.role === "CR") {
    const { redirect } = await import("next/navigation");
    redirect("/cr");
  }
  if (user?.role === "ADMIN") {
    const { redirect } = await import("next/navigation");
    redirect("/admin");
  }

  const student = await resolveCurrentStudent();
  
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Student Context Found</h2>
        <p className="text-muted-foreground">Please configure student account or login.</p>
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
  const [
    todaysClasses,
    pendingHomeworkList,
    latestNotices,
    attendanceRecords
  ] = await Promise.all([
    db.query.weeklyRoutine.findMany({
      where: eq(weeklyRoutine.dayOfWeek, dayOfWeek),
      orderBy: [asc(weeklyRoutine.startTime)],
      with: {
        subject: {
          with: { teacher: true }
        }
      }
    }),
    db.query.homework.findMany({
      where: eq(homework.status, 'active'),
      orderBy: [asc(homework.dueDate)],
      limit: 5,
      with: { subject: true }
    }),
    db.query.notices.findMany({
      orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
      limit: 3
    }),
    db.query.attendance.findMany({
      where: eq(attendance.studentId, student.id)
    })
  ]);

  const validNotices = latestNotices.filter(n => !n.expiresAt || n.expiresAt.getTime() > timestampNow);

  // Overall Attendance Calculation via Domain Engine
  const totalClasses = attendanceRecords.length;
  const presentClasses = attendanceRecords.filter(a => a.status === 'present').length;
  const metrics = calculateAttendanceMetrics(presentClasses, totalClasses, undefined, 80);

  // Derived stats
  const firstName = student.name.split(' ')[0];
  const nptHour = parseInt(nptTime.split(":")[0], 10);
  const greeting = nptHour < 12 ? "Good morning" : nptHour < 17 ? "Good afternoon" : "Good evening";
  const formattedDate = formatNepaliDate(nptDate, 'dddd, YYYY MMMM DD');

  const getRelativePostedTime = (date: Date) => {
    const diffMs = timestampNow - date.getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatNepaliDate(date);
  };

  const getRelativeClassTime = (startTime: string, npt: string) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [nh, nm] = npt.split(':').map(Number);
    const diffMins = (sh * 60 + sm) - (nh * 60 + nm);
    if (diffMins <= 0) return null;
    if (diffMins < 60) return `Starts in ${diffMins} min`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `Starts in ${hrs}h ${mins}m`;
  };

  const getDueStatus = (dueDate: Date) => {
    const diffMs = dueDate.getTime() - timestampNow;
    if (diffMs < 0) return { label: "Overdue", color: "bg-destructive/10 text-destructive" };
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 24) return { label: `Due in ${diffHrs} hrs`, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" };
    const diffDays = Math.ceil(diffHrs / 24);
    return { label: `Due in ${diffDays} days`, color: "bg-primary/10 text-primary" };
  };

  const isSafeZone = metrics.category === "SAFE";
  const isDangerZone = metrics.category === "DANGER";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Hero Gradient Banner */}
      <div className="w-full rounded-2xl p-6 md:p-8 shadow-sm bg-gradient-to-br from-indigo-900 via-primary to-sky-700 text-white">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight font-fira-sans">{greeting}, {firstName}!</h1>
            <p className="text-white/80 font-medium text-sm md:text-base">{formattedDate}</p>
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none flex flex-col min-w-[120px] p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-white/70 text-xs font-medium mb-1">Attendance</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isSafeZone ? "bg-emerald-400" : isDangerZone ? "bg-destructive" : "bg-amber-400"}`} />
                <span className="text-xl md:text-2xl font-bold tabular-nums">{metrics.percentage}%</span>
              </div>
            </div>
            <div className="flex-1 lg:flex-none flex flex-col min-w-[120px] p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-white/70 text-xs font-medium mb-1">Classes Today</span>
              <span className="text-xl md:text-2xl font-bold tabular-nums">{todaysClasses.length}</span>
            </div>
            <div className="flex-1 lg:flex-none flex flex-col min-w-[120px] p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-white/70 text-xs font-medium mb-1">Pending Tasks</span>
              <span className="text-xl md:text-2xl font-bold tabular-nums">{pendingHomeworkList.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Schedule / Timetable Card */}
          <div data-testid="upcoming-classes" className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight text-foreground font-fira-sans">Today&apos;s Timetable</h2>
              </div>
              <Link href="/routine" className="text-xs font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer">
                Full Routine <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            {todaysClasses.length > 0 ? (
              <div className="space-y-3">
                {todaysClasses.map(cls => {
                  const isPast = cls.endTime < nptTime;
                  const isCurrent = cls.startTime <= nptTime && cls.endTime >= nptTime;
                  const relativeTime = getRelativeClassTime(cls.startTime, nptTime);
                  
                  return (
                    <div 
                      key={cls.id} 
                      data-testid={isCurrent ? "live-class-card" : undefined}
                      className={cn(
                        "relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg transition-colors border",
                        isCurrent 
                          ? "bg-primary/5 border-primary/30 shadow-sm" 
                          : isPast 
                          ? "opacity-60 grayscale-[40%] bg-muted/20 border-transparent hover:bg-muted/40" 
                          : "bg-muted/10 border-border/30 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center sm:w-28 shrink-0 text-center">
                          <span className={cn("text-xs font-semibold tabular-nums", isPast ? "line-through text-muted-foreground" : "text-foreground")}>
                            {formatTime12h(cls.startTime)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            to {formatTime12h(cls.endTime)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={cn("font-bold text-base leading-tight", isPast ? "text-muted-foreground line-through" : "text-foreground")}>
                              {cls.subject.name}
                            </h3>
                            {isCurrent && (
                              <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wider animate-pulse">
                                NOW
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            {cls.subject.teacher?.name || "TBA"} 
                            {cls.room && (
                              <>
                                <span className="opacity-40">•</span> 
                                <span>{cls.room.startsWith('Room') || cls.room.startsWith('Lab') ? cls.room : `Room ${cls.room}`}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center gap-2">
                        {(cls.subject.name.toLowerCase().includes("lab") || cls.subject.name.toLowerCase().includes("practical")) && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                            <Laptop className="w-3 h-3" /> Lab
                          </div>
                        )}
                        {!isPast && !isCurrent && relativeTime && (
                          <span className="text-xs font-medium text-primary tabular-nums bg-primary/10 px-2 py-0.5 rounded">
                            {relativeTime}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mb-2 text-muted-foreground/60" />
                <p className="font-medium text-sm">No classes scheduled today — enjoy your day off!</p>
              </div>
            )}
          </div>

          {/* Assignments & Deadlines Card */}
          <div data-testid="active-assignments-card" className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Book className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight text-foreground font-fira-sans">Assignments & Deadlines</h2>
              </div>
              <Link href="/homework" className="text-xs font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingHomeworkList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pendingHomeworkList.map(hw => {
                  const status = getDueStatus(hw.dueDate);
                  return (
                    <div key={hw.id} className="p-4 rounded-lg bg-muted/20 border border-border/30 flex flex-col justify-between hover:bg-muted/30 transition-colors">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{hw.title}</h3>
                          <span className={cn("px-2.5 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap tabular-nums shrink-0", status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{hw.subject.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mb-2 text-muted-foreground/60" />
                <p className="font-medium text-sm">All caught up! No pending assignments.</p>
              </div>
            )}
          </div>

          {/* Recent Study Materials Widget */}
          <RecentResourcesWidget />
        </div>

        {/* Right Column (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Attendance Safety Barometer */}
          <div data-testid="attendance-gauge" className="rounded-xl border border-border/40 shadow-sm p-6 bg-card flex flex-col items-center text-center">
            <h2 className="text-base font-semibold mb-4 w-full text-left font-fira-sans">Attendance Barometer</h2>
            
            <div className="flex justify-center py-2">
              <ArcGauge value={metrics.percentage} />
            </div>

            <div className="mb-4">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2",
                isSafeZone ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : 
                (isDangerZone ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")
              )}>
                {isSafeZone ? <CheckCircle2 className="w-3.5 h-3.5" /> : (isDangerZone ? <AlertTriangle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />)}
                {isSafeZone ? "SAFE ZONE" : (isDangerZone ? "DANGER" : "CAUTION")}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {isSafeZone ? "You're above the TU 80% requirement." : 
                 (isDangerZone ? "At risk of TU exam disqualification." : `Attend next classes to reach 80%.`)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {presentClasses} of {totalClasses} classes attended
              </p>
            </div>

            <Link href="/attendance" className="text-xs font-semibold text-primary hover:underline mt-auto cursor-pointer">
              View Full Breakdown →
            </Link>
          </div>

          {/* Notice Board Card */}
          <div data-testid="pinned-notices" className="rounded-xl border border-border/40 shadow-sm p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-foreground" />
                <h2 className="text-base font-semibold tracking-tight text-foreground font-fira-sans">Notice Board</h2>
              </div>
              <Link href="/notices" className="text-xs font-medium text-primary hover:underline cursor-pointer">
                View All
              </Link>
            </div>
            
            {validNotices.length > 0 ? (
              <div className="space-y-3">
                {validNotices.map(notice => (
                  <div key={notice.id} className="flex flex-col pb-3 border-b border-border/30 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-semibold text-xs text-foreground line-clamp-1 leading-snug">
                        {notice.isPinned && <span className="mr-1">📌</span>}
                        {notice.title}
                      </h4>
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        {getRelativePostedTime(notice.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium">{notice.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-xs font-medium">No active notices.</p>
              </div>
            )}
          </div>

          {/* Internal Assessment Tracker Placeholder */}
          <div className="rounded-xl border border-border/40 shadow-sm p-5 bg-muted/10 flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-xs text-foreground mb-1">Internal Marks & Assessment</h3>
            <p className="text-xs text-muted-foreground mb-3">Track your 40-mark internal marks per subject.</p>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
              Coming Soon
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
