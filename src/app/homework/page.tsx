import { db } from "@/db";
import { homework } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeworkStatusActions } from "./status-actions";
import { StatusChip } from "@/components/student/status-chip";
import { getPermissions } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function HomeworkPage() {
  const permissions = await getPermissions();
  const allHomework = await db.query.homework.findMany({
    orderBy: [desc(homework.createdAt)],
    with: { subject: true },
  });

  const active = allHomework.filter(h => h.status === "active").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const completed = allHomework.filter(h => h.status === "completed").sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  const archived = allHomework.filter(h => h.status === "archived").sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

  const renderHomeworkCard = (hw: typeof allHomework[0]) => (
    <Card key={hw.id} className="flex flex-col rounded-xl overflow-hidden shadow-sm">
      <CardHeader className="pb-3 bg-muted/20 border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{hw.title}</CardTitle>
            <div className="text-sm font-semibold text-primary mt-1">{hw.subject.name}</div>
          </div>
          <StatusChip 
            status={hw.status === 'active' ? 'due_soon' : hw.status === 'completed' ? 'completed' : 'not_started'} 
            label={hw.status} 
            className="capitalize"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">{hw.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-6 text-sm bg-muted/30 border border-dashed p-3 rounded-lg">
          <div>
            <span className="text-muted-foreground block text-xs">Assigned</span>
            <span className="font-semibold text-foreground/80">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(hw.assignedDate)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Due</span>
            <span className="font-semibold text-foreground/80">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(hw.dueDate)}</span>
          </div>
        </div>

        {permissions.canCreateHomework && (
          <div className="mt-4 pt-4 border-t">
            <HomeworkStatusActions id={hw.id} currentStatus={hw.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
          <p className="text-muted-foreground mt-1">Manage and track your coursework.</p>
        </div>
        {permissions.canCreateHomework && (
          <Link className={buttonVariants({ variant: "default" })} href="/homework/new">
            <Plus className="mr-2 h-4 w-4" /> Assign New
          </Link>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No active assignments. Great job!</p>
            ) : (
              active.map(renderHomeworkCard)
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 opacity-90">
            {completed.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No completed assignments yet.</p>
            ) : (
              completed.map(renderHomeworkCard)
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="archived" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 opacity-70">
            {archived.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No archived assignments.</p>
            ) : (
              archived.map(renderHomeworkCard)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
