import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoticeActions } from "./notice-actions";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const allNotices = await db.query.notices.findMany({
    orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
  });

  const now = new Date().getTime();

  const activeNotices = allNotices.filter(n => !n.expiresAt || n.expiresAt.getTime() > now);
  const pastNotices = allNotices.filter(n => n.expiresAt && n.expiresAt.getTime() <= now);

  const renderNoticeCard = (notice: typeof allNotices[0], isPast: boolean) => (
    <Card key={notice.id} className={`flex flex-col ${isPast ? 'opacity-70' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl flex items-center gap-2">
            {notice.isPinned && <span title="Pinned">📌</span>}
            {notice.title}
          </CardTitle>
          <NoticeActions id={notice.id} isPinned={notice.isPinned} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Posted: {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(notice.createdAt)}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm whitespace-pre-wrap flex-1 mb-4">{notice.content}</p>
        {notice.expiresAt && (
          <div className="text-xs text-muted-foreground mt-auto">
            {isPast ? "Expired on: " : "Expires on: "}
            {new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium' }).format(notice.expiresAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Notice Board</h2>
        <Link className={buttonVariants({ variant: "default" })} href="/notices/new">
          <Plus className="mr-2 h-4 w-4" /> Publish Notice
        </Link>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight text-primary">Active Notices</h3>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeNotices.length === 0 ? (
            <p className="text-muted-foreground col-span-full">No active notices.</p>
          ) : (
            activeNotices.map(n => renderNoticeCard(n, false))
          )}
        </div>
      </div>

      {pastNotices.length > 0 && (
        <div className="space-y-4 pt-8 border-t">
          <h3 className="text-2xl font-semibold tracking-tight">Past Notices</h3>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pastNotices.map(n => renderNoticeCard(n, true))}
          </div>
        </div>
      )}
    </div>
  );
}
