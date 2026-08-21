import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, weeklyRoutine } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, BookOpen, Clock } from "lucide-react";

export default async function TeacherDashboard() {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  
  if (!user.teacherId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
          Your account is not linked to a teacher profile.
        </div>
      </div>
    );
  }

  // Fetch assigned subjects
  const assignedSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.teacherId, user.teacherId));

  // Fetch today's classes
  // Timezone standardization: NPT day of week
  const today = new Date();
  const options = { timeZone: 'Asia/Kathmandu', weekday: 'long' } as const;
  const todayString = new Intl.DateTimeFormat('en-US', options).format(today);
  
  // Convert day string to integer matching our DB (0 = Sunday, 1 = Monday, etc.)
  const daysMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  const dayOfWeek = daysMap[todayString];

  // Get routines for today for the teacher's subjects
  const todayClasses = await db
    .select({
      routine: weeklyRoutine,
      subject: subjects
    })
    .from(weeklyRoutine)
    .innerJoin(subjects, eq(subjects.id, weeklyRoutine.subjectId))
    .where(
      and(
        eq(weeklyRoutine.dayOfWeek, dayOfWeek),
        eq(subjects.teacherId, user.teacherId)
      )
    );

  // Sort classes by start time
  todayClasses.sort((a, b) => a.routine.startTime.localeCompare(b.routine.startTime));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
      <p className="text-muted-foreground">Welcome to the Teacher Portal, {user.name}.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              My Subjects
            </CardTitle>
            <CardDescription>Subjects you are currently assigned to teach.</CardDescription>
          </CardHeader>
          <CardContent>
            {assignedSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects assigned.</p>
            ) : (
              <ul className="space-y-3">
                {assignedSubjects.map(sub => (
                  <li key={sub.id} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-semibold">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">{sub.code}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-primary" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your schedule for today ({todayString}).</CardDescription>
          </CardHeader>
          <CardContent>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes scheduled for today.</p>
            ) : (
              <ul className="space-y-3">
                {todayClasses.map(({ routine, subject }) => (
                  <li key={routine.id} className="flex gap-4 p-3 rounded-lg border bg-card">
                    <div className="flex flex-col items-center justify-center bg-primary/10 text-primary rounded-md p-2 min-w-20">
                      <Clock className="w-4 h-4 mb-1" />
                      <span className="text-xs font-semibold">{routine.startTime}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">Room: {routine.room || "N/A"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
