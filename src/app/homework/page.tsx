import { db } from "@/db";
import { homework } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeworkStatusActions } from "./status-actions";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function HomeworkPage() {
  const allHomework = await db.query.homework.findMany({
    orderBy: [desc(homework.createdAt)],
    with: { subject: true },
  });

  const active = allHomework.filter(h => h.status === "active").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const completed = allHomework.filter(h => h.status === "completed").sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  const archived = allHomework.filter(h => h.status === "archived").sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

  const renderHomeworkCard = (hw: typeof allHomework[0]) => (
    <Card key={hw.id} className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{hw.title}</CardTitle>
            <div className="text-sm font-medium text-primary mt-1">{hw.subject.name}</div>
          </div>
          <Badge variant={hw.status === 'active' ? 'default' : hw.status === 'completed' ? 'secondary' : 'outline'}>
            {hw.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">{hw.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-6 text-sm bg-muted/50 p-3 rounded-md">
          <div>
            <span className="text-muted-foreground block text-xs">Assigned</span>
            <span className="font-medium">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(hw.assignedDate)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Due</span>
            <span className="font-medium">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(hw.dueDate)}</span>
          </div>
        </div>

        <HomeworkStatusActions id={hw.id} currentStatus={hw.status} />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
        <Link className={buttonVariants({ variant: "default" })} href="/homework/new">
          <Plus className="mr-2 h-4 w-4" /> Assign New
        </Link>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight text-primary">Active Assignments</h3>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {active.length === 0 ? (
            <p className="text-muted-foreground col-span-full">No active assignments.</p>
          ) : (
            active.map(renderHomeworkCard)
          )}
        </div>
      </div>

      {(completed.length > 0 || archived.length > 0) && (
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-2xl font-semibold tracking-tight">Past Assignments</h3>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 opacity-80">
            {[...completed, ...archived].map(renderHomeworkCard)}
          </div>
        </div>
      )}
    </div>
  );
}
