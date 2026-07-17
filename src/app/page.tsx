import { db } from "@/db";
import { weeklyRoutine, classSessions, homework, notices, events } from "@/db/schema";
import { desc, eq, and, gte, asc, isNull } from "drizzle-orm";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Clock, Book, Bell, CalendarDays, Calendar } from "lucide-react";
import { formatTime12h } from "@/lib/time";

export default async function Dashboard() {
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
        with: {
          teacher: true
        }
      }
    }
  });

  const nextClass = todaysClasses.find(c => c.startTime >= nptTime) || null;

  const latestHomeworkList = await db.query.homework.findMany({
    where: eq(homework.status, 'active'),
    orderBy: [asc(homework.dueDate)],
    limit: 1,
    with: { subject: true }
  });
  const latestHomework = latestHomeworkList[0] || null;

  const latestNotices = await db.query.notices.findMany({
    orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
    limit: 1
  });
  // Filter out expired notices in memory, since we don't have a reliable way to compare timestamp with Date object in SQLite without raw SQL
  const latestNotice = latestNotices.find(n => !n.expiresAt || n.expiresAt.getTime() > timestampNow) || null;

  const upcomingEvents = await db.query.events.findMany({
    where: gte(events.eventDate, new Date(nptDate.toISOString().split('T')[0] + 'T00:00:00Z')),
    orderBy: [asc(events.eventDate), asc(events.startTime)],
    limit: 1
  });
  const upcomingEvent = upcomingEvents[0] || null;

  const recentSessions = await db.query.classSessions.findMany({
    orderBy: [desc(classSessions.sessionDate), desc(classSessions.startTime)],
    limit: 1,
    with: { subject: true }
  });
  const recentSession = recentSessions[0] || null;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Next Class */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Class Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextClass ? (
              <>
                <div className="text-2xl font-bold">{nextClass.subject.name}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime12h(nextClass.startTime)} - {formatTime12h(nextClass.endTime)} {nextClass.room ? `| ${nextClass.room}` : ""}
                </p>
                <Link href="/today" className={buttonVariants({ variant: "link", className: "px-0 h-auto mt-2" })}>
                  View Today's Routine
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No more classes today.</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Homework */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Homework</CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {latestHomework ? (
              <>
                <div className="text-2xl font-bold truncate" title={latestHomework.title}>{latestHomework.title}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestHomework.subject.name} | Due: {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(latestHomework.dueDate)}
                </p>
                <Link href="/homework" className={buttonVariants({ variant: "link", className: "px-0 h-auto mt-2" })}>
                  View All Homework
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No active homework right now.</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Notice */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Notice</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {latestNotice ? (
              <>
                <div className="text-lg font-bold line-clamp-1" title={latestNotice.title}>
                  {latestNotice.isPinned && "📌 "} {latestNotice.title}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {latestNotice.content}
                </p>
                <Link href="/notices" className={buttonVariants({ variant: "link", className: "px-0 h-auto mt-2" })}>
                  View Notice Board
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No active notices.</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Event */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Event</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcomingEvent ? (
              <>
                <div className="text-lg font-bold line-clamp-1" title={upcomingEvent.title}>{upcomingEvent.title}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(upcomingEvent.eventDate)} 
                  {upcomingEvent.startTime ? ` at ${upcomingEvent.startTime}` : ""}
                </p>
                <Link href="/events" className={buttonVariants({ variant: "link", className: "px-0 h-auto mt-2" })}>
                  View Event Calendar
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No upcoming events scheduled.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Session */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Session</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentSession ? (
              <>
                <div className="text-lg font-bold">{recentSession.subject.name}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(recentSession.sessionDate)} | {formatTime12h(recentSession.startTime)}
                </p>
                <Link href={`/sessions/${recentSession.id}`} className={buttonVariants({ variant: "link", className: "px-0 h-auto mt-2" })}>
                  View Session Details
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No sessions logged yet.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
