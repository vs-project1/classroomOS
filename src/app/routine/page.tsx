import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { DeleteRoutineButton } from "./delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime12h } from "@/lib/time";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function RoutinePage() {
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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Weekly Routine</h2>
        <Link className={buttonVariants({ variant: "default" })} href="/routine/new">
          <Plus className="mr-2 h-4 w-4" /> Add Routine
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {grouped.map((group) => (
          <Card key={group.dayName} className="flex flex-col">
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle className="text-lg">{group.dayName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {group.routines.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">No classes</div>
              ) : (
                <ul className="divide-y">
                  {group.routines.map(routine => (
                    <li key={routine.id} className="p-4 flex flex-col gap-2 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-lg">{routine.subject.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTime12h(routine.startTime)} - {formatTime12h(routine.endTime)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Link className={buttonVariants({ variant: "ghost", size: "icon" })} href={`/routine/${routine.id}/edit`} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <DeleteRoutineButton id={routine.id} />
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                        {(routine.subject.teacher?.name || routine.teacherName) && (
                          <div>
                            <span className="font-medium text-foreground">Teacher:</span> {routine.subject.teacher?.name || routine.teacherName}
                          </div>
                        )}
                        {routine.room && <div><span className="font-medium text-foreground">Room:</span> {routine.room}</div>}
                        {routine.notes && <div className="col-span-2"><span className="font-medium text-foreground">Notes:</span> {routine.notes}</div>}
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
