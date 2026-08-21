import { db } from "@/db";
import { weeklyRoutine, classSessions, homework, notices, events } from "@/db/schema";
import { desc, eq, gte, asc } from "drizzle-orm";
import Link from "next/link";
import { Clock, Book, Bell, CalendarDays, Calendar, ArrowRight, PenTool, Megaphone, ClipboardList, Lock } from "lucide-react";
import { formatTime12h } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Get Nepal Time
  const nptDateString = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'short' }).format(new Date());
  const nptDate = new Date(nptDateString);
  const dayOfWeek = nptDate.getDay();
  const nptTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const timestampNow = new Date().getTime();

  // Queries
  const [
    todaysClasses,
    latestHomeworkList,
    latestNotices,
    upcomingEvents,
    recentSessions,
    activeHomeworkCount,
    noticesCount
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
      limit: 1,
      with: { subject: true }
    }),
    db.query.notices.findMany({
      orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
      limit: 1
    }),
    db.query.events.findMany({
      where: gte(events.eventDate, new Date(nptDate.toISOString().split('T')[0] + 'T00:00:00Z')),
      orderBy: [asc(events.eventDate), asc(events.startTime)],
      limit: 1
    }),
    db.query.classSessions.findMany({
      orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
      limit: 1,
      with: { subject: true }
    }),
    // Real counts — the KPI cards previously rendered `limit:1` list lengths
    // (always 0 or 1) as totals.
    db.$count(homework, eq(homework.status, 'active')),
    db.$count(notices)
  ]);

  const latestHomework = latestHomeworkList[0] || null;
  const latestNotice = latestNotices.find(n => !n.expiresAt || n.expiresAt.getTime() > timestampNow) || null;
  const upcomingEvent = upcomingEvents[0] || null;
  const recentSession = recentSessions[0] || null;

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 max-w-7xl mx-auto">
      {/* 1. Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2 font-medium">Classroom operations and scheduling overview.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col">
            <span className="text-3xl font-bold tabular-nums text-foreground leading-none">{todaysClasses.length}</span>
            <span className="text-sm text-muted-foreground mt-1 font-medium">Classes Today</span>
          </div>
          <div className="w-px bg-border/60 mx-2" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold tabular-nums text-foreground leading-none">{activeHomeworkCount}</span>
            <span className="text-sm text-muted-foreground mt-1 font-medium">Active HW</span>
          </div>
          <div className="w-px bg-border/60 mx-2" />
          <div className="flex flex-col">
            <span className="text-3xl font-bold tabular-nums text-foreground leading-none">{noticesCount}</span>
            <span className="text-sm text-muted-foreground mt-1 font-medium">Notices</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/sessions/new" className="flex items-center gap-4 bg-card hover:bg-accent hover:text-accent-foreground rounded-xl p-4 transition-all border border-border/40 group cursor-pointer shadow-sm hover:shadow-md">
          <PenTool className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Log Session</span>
        </Link>
        <Link href="/admin/notices" className="flex items-center gap-4 bg-card hover:bg-accent hover:text-accent-foreground rounded-xl p-4 transition-all border border-border/40 group cursor-pointer shadow-sm hover:shadow-md">
          <Megaphone className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Post Notice</span>
        </Link>
        <Link href="/admin/homework" className="flex items-center gap-4 bg-card hover:bg-accent hover:text-accent-foreground rounded-xl p-4 transition-all border border-border/40 group cursor-pointer shadow-sm hover:shadow-md">
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Create Assignment</span>
        </Link>
        <Link href="/routine" className="flex items-center gap-4 bg-card hover:bg-accent hover:text-accent-foreground rounded-xl p-4 transition-all border border-border/40 group cursor-pointer shadow-sm hover:shadow-md">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">View Routine</span>
        </Link>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Schedule Card */}
          <div className="rounded-xl border border-border/40 bg-card p-6 flex flex-col h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" /> Today's Schedule
              </h3>
            </div>
            
            {todaysClasses.length > 0 ? (
              <div className="space-y-2 mb-6">
                {todaysClasses.map(c => {
                  const isCurrent = c.startTime <= nptTime && c.endTime >= nptTime;
                  return (
                    <div key={c.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${isCurrent ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'}`}>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {c.subject.name}
                          {isCurrent && <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Now</span>}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {c.subject.teacher?.name || "TBA"} {c.room ? `• Room ${c.room}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium tabular-nums text-foreground">{formatTime12h(c.startTime)} - {formatTime12h(c.endTime)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
               <div className="text-muted-foreground text-sm mb-6 bg-muted/20 p-8 text-center rounded-lg border border-dashed border-border/40 flex-1 flex items-center justify-center">No classes scheduled for today.</div>
            )}
            <Link href="/routine" className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-auto hover:underline w-fit cursor-pointer">
              View Full Routine <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {/* Recent Activity Card */}
          <div className="rounded-xl border border-border/40 bg-card p-6">
            <h3 className="font-semibold text-lg mb-6 text-foreground flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-muted-foreground" /> Recent Activity
            </h3>
            <div className="space-y-4">
              {recentSession && (
                <div className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-border/20">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Session Logged: {recentSession.subject.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(recentSession.sessionDate)} at {formatTime12h(recentSession.startTime)}
                    </div>
                  </div>
                </div>
              )}

              {latestHomework && (
                <div className="flex gap-4 p-4 rounded-lg bg-muted/20 border border-border/20">
                  <Book className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-foreground">Assignment Created: {latestHomework.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {latestHomework.subject.name} • Due {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(latestHomework.dueDate)}
                    </div>
                  </div>
                </div>
              )}

              {!recentSession && !latestHomework && (
                <div className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border/40 rounded-lg">No recent activity.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Notice Board Card */}
          <div className="rounded-xl border border-border/40 bg-card p-6 flex flex-col">
            <h3 className="font-semibold text-lg mb-5 text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" /> Notice Board
            </h3>
            {latestNotice ? (
              <div className="mb-6">
                <div className="font-medium text-sm text-foreground mb-2">
                  {latestNotice.isPinned && "📌 "} {latestNotice.title}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {latestNotice.content}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6 bg-muted/20 p-4 text-center rounded-lg">No active notices.</p>
            )}
            <Link href="/admin/notices" className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-auto hover:underline w-fit cursor-pointer">
              Manage Notices <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Upcoming Event Card */}
          <div className="rounded-xl border border-border/40 bg-card p-6 flex flex-col">
            <h3 className="font-semibold text-lg mb-5 text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" /> Next Event
            </h3>
            {upcomingEvent ? (
              <div className="mb-6">
                <div className="text-lg font-medium text-foreground mb-2">{upcomingEvent.title}</div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(upcomingEvent.eventDate)}
                  {upcomingEvent.startTime && ` at ${formatTime12h(upcomingEvent.startTime)}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">No upcoming events scheduled.</p>
            )}
            <Link href="/admin/events" className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-auto hover:underline w-fit cursor-pointer">
              View Calendar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* At-Risk Students Card */}
          <div className="rounded-xl border border-border/40 bg-card p-6 flex flex-col h-full min-h-[180px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">At-Risk Students</h3>
              <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center bg-muted/10 rounded-lg border border-dashed border-border/40">
              <Lock className="h-6 w-6 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground max-w-[200px]">Students below 80% attendance or &lt;16/40 internal marks.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
