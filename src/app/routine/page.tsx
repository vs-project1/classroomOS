import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { DeleteRoutineButton } from "./delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime12h } from "@/lib/time";
import { getPermissions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function RoutinePage() {
  const permissions = await getPermissions();
  const allRoutine = await db.query.weeklyRoutine.findMany({
    orderBy: [asc(weeklyRoutine.dayOfWeek), asc(weeklyRoutine.startTime)],
    with: {
      subject: {
        with: {
          teacher: true,
        }
      }
    },
  });

  const grouped = DAYS.map((dayName, index) => {
    return {
      dayName,
      routines: allRoutine.filter(r => r.dayOfWeek === index),
    };
  });

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Weekly Routine</h2>
          <p className="text-muted-foreground mt-1">Your class schedule for the week.</p>
        </div>
        {permissions.canManageRoutine && (
          <Link className={buttonVariants({ variant: "default" })} href="/routine/new">
            <Plus className="mr-2 h-4 w-4" /> Add Routine
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grouped.map((group) => (
          <Card key={group.dayName} className="flex flex-col rounded-xl overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-3 border-b">
              <CardTitle className="text-lg">{group.dayName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {group.routines.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center bg-card">No classes scheduled</div>
              ) : (
                <ul className="divide-y">
                  {group.routines.map(routine => (
                    <li key={routine.id} className="p-4 flex flex-col gap-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-lg text-primary">{routine.subject.name}</div>
                          <div className="text-sm font-medium text-muted-foreground mt-0.5">
                            {formatTime12h(routine.startTime)} - {formatTime12h(routine.endTime)}
                          </div>
                        </div>
                        {permissions.canManageRoutine && (
                          <div className="flex gap-1">
                            <Link className={buttonVariants({ variant: "ghost", size: "icon" })} href={`/routine/${routine.id}/edit`} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Link>
                            <DeleteRoutineButton id={routine.id} />
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-dashed grid grid-cols-2 gap-x-2 gap-y-1">
                        {(routine.subject.teacher?.name || routine.teacherName) && (
                          <div>
                            <span className="font-semibold text-foreground/80">Teacher:</span> {routine.subject.teacher?.name || routine.teacherName}
                          </div>
                        )}
                        {routine.room && <div><span className="font-semibold text-foreground/80">Room:</span> {routine.room}</div>}
                        {routine.notes && <div className="col-span-2"><span className="font-semibold text-foreground/80">Notes:</span> {routine.notes}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
