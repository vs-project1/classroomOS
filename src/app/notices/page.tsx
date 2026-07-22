import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Pin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoticeActions } from "./notice-actions";
import { getPermissions } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const permissions = await getPermissions();
  const allNotices = await db.query.notices.findMany({
    orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
  });

  const now = new Date().getTime();

  const activeNotices = allNotices.filter(n => !n.expiresAt || n.expiresAt.getTime() > now);
  const pastNotices = allNotices.filter(n => n.expiresAt && n.expiresAt.getTime() <= now);

  const renderNoticeCard = (notice: typeof allNotices[0], isPast: boolean) => (
    <Card key={notice.id} className={`flex flex-col rounded-xl overflow-hidden shadow-sm ${isPast ? 'opacity-70 bg-muted/30' : notice.isPinned ? 'border-primary ring-1 ring-primary/20' : ''}`}>
      <CardHeader className={`pb-3 border-b ${notice.isPinned ? 'bg-primary/5' : 'bg-muted/20'}`}>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-lg flex items-start gap-2">
            {notice.isPinned && <Pin className="w-4 h-4 mt-1 text-primary shrink-0 fill-primary" />}
            {notice.title}
          </CardTitle>
          {permissions.canCreateNotices && <NoticeActions id={notice.id} isPinned={notice.isPinned} />}
        </div>
        <div className="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Posted: {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(notice.createdAt)}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        <p className="text-sm whitespace-pre-wrap flex-1 mb-4 text-foreground/90">{notice.content}</p>
        {notice.expiresAt && (
          <div className="text-xs font-semibold text-muted-foreground mt-auto bg-muted/50 w-fit px-2.5 py-1 rounded-md">
            {isPast ? "Expired: " : "Expires: "}
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(notice.expiresAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notice Board</h2>
          <p className="text-muted-foreground mt-1">Important announcements and updates.</p>
        </div>
        {permissions.canCreateNotices && (
          <Link className={buttonVariants({ variant: "default" })} href="/notices/new">
            <Plus className="mr-2 h-4 w-4" /> Publish Notice
          </Link>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({activeNotices.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastNotices.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeNotices.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No active notices.</p>
            ) : (
              activeNotices.map(n => renderNoticeCard(n, false))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="past" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pastNotices.length === 0 ? (
              <p className="text-muted-foreground col-span-full py-12 text-center bg-card rounded-xl border">No past notices.</p>
            ) : (
              pastNotices.map(n => renderNoticeCard(n, true))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
