import { db } from "@/db";
import { homework } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus, CheckCircle2, Clock, Calendar, CheckSquare, Code, DownloadCloud } from "lucide-react";
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

  const renderHomeworkList = (hwList: typeof allHomework, isArchived: boolean) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {hwList.length === 0 ? (
        <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5">
          <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <CheckSquare className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">No deliverables found in this category.</p>
        </div>
      ) : (
        hwList.map(hw => {
          const isOverdue = hw.status === "active" && hw.dueDate.getTime() < new Date().getTime();
          const hasCode = hw.description?.toLowerCase().includes('code') || hw.description?.toLowerCase().includes('program');
          
          return (
            <div key={hw.id} className={`group flex flex-col justify-between rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden relative ${isArchived ? 'opacity-60 grayscale-[0.2]' : ''} ${isOverdue ? 'border-destructive/30' : ''}`}>
              {isOverdue && <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />}
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1.5">
                    <StatusChip 
                      status={hw.status === 'active' ? (isOverdue ? 'overdue' : 'due_soon') : hw.status === 'completed' ? 'completed' : 'not_started'} 
                      label={isOverdue ? 'Overdue' : hw.status} 
                      className="capitalize w-fit"
                    />
                    {hasCode && (
                      <span className="text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 flex items-center gap-1 w-fit">
                        <Code className="w-3 h-3" /> Coding Assignment
                      </span>
                    )}
                  </div>
                  {permissions.canCreateHomework && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm z-10">
                      <HomeworkStatusActions id={hw.id} currentStatus={hw.status} />
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <h3 className="text-lg font-bold font-fira-sans text-foreground leading-tight mb-1">{hw.title}</h3>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{hw.subject.name}</div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4 font-medium" title={hw.description || ""}>
                  {hw.description}
                </p>
              </div>
              
              <div className="px-6 py-4 border-t border-border/50 bg-muted/5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-fira-code">
                  <span className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Assigned</span>
                  <span className="text-foreground font-medium">{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(hw.assignedDate)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-fira-code">
                  <span className="text-muted-foreground uppercase tracking-wider text-xs font-semibold">Deadline</span>
                  <span className={`${isOverdue ? 'text-destructive font-bold' : 'text-foreground font-medium'}`}>
                    {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(hw.dueDate)}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-bold font-fira-sans tracking-tight text-foreground">Assignments</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Track mandatory academic submissions, project milestones, and practical lab record deadlines.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canCreateHomework && (
            <Link className={`text-xs font-semibold px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer`} href="/admin/homework/new">
              <Plus className="h-3.5 w-3.5" /> Assign New
            </Link>
          )}
        </div>
      </div>

      {allHomework.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4 max-w-md mx-auto text-center">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4 relative">
            <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold font-fira-sans tracking-tight">No Assignments Found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You have no pending assignments or project deliverables. Upcoming lab reports, programming assignments, and semester projects will appear here once assigned by faculty.
          </p>
          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
              <DownloadCloud className="w-4 h-4" /> Sync Deadlines
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors cursor-pointer">
              View Graded Submissions
            </button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6 w-full md:w-auto h-11 bg-muted/50 p-1 border rounded-xl">
            <TabsTrigger value="active" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Active Queue ({active.length})</TabsTrigger>
            <TabsTrigger value="completed" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="archived" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Archived ({archived.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderHomeworkList(active, false)}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderHomeworkList(completed, true)}
          </TabsContent>
          
          <TabsContent value="archived" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderHomeworkList(archived, true)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
