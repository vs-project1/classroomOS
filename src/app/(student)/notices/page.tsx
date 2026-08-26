import { db } from "@/db";
import { notices } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, Pin, Clock, BellRing, Megaphone } from "lucide-react";
import { NoticeActions } from "./notice-actions";
import { getPermissions } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilePreview } from "@/components/files/file-preview";
import { formatNepaliDate, formatNepaliDateTime } from "@/lib/nepali-date";

function inferFileType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return ext || "file";
}

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const permissions = await getPermissions();
  const allNotices = await db.query.notices.findMany({
    orderBy: [desc(notices.isPinned), desc(notices.createdAt)],
  });

  const now = new Date().getTime();

  const activeNotices = allNotices.filter(n => !n.expiresAt || n.expiresAt.getTime() > now);
  const pastNotices = allNotices.filter(n => n.expiresAt && n.expiresAt.getTime() <= now);

  const renderNoticeList = (noticeList: typeof allNotices, isPast: boolean) => (
    <div className="flex flex-col gap-4">
      {noticeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5">
          <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <BellRing className="w-5 h-5 text-muted-foreground opacity-50" />
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">No notices in this tab.</p>
        </div>
      ) : (
        noticeList.map(notice => (
          <div key={notice.id} className={`group relative p-6 rounded-xl border bg-card hover:bg-muted/10 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-6 md:items-start overflow-hidden ${isPast ? 'opacity-60 grayscale-[0.2]' : ''}`}>
            {notice.isPinned && (
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            )}
            
            <div className="w-full md:w-48 shrink-0 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded w-fit">
                {formatNepaliDate(notice.createdAt)}
              </div>
              
              <div className="flex flex-col gap-1.5">
                {notice.isPinned && (
                  <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-primary bg-primary/10 px-2.5 py-1 rounded border border-primary/20 w-fit">
                    <Pin className="w-3 h-3 fill-primary" /> Pinned Alert
                  </div>
                )}
                {notice.expiresAt && (
                  <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 w-fit">
                    <Clock className="w-3 h-3" /> 
                    {isPast ? "Expired" : "Expiring"}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-lg md:text-xl font-bold font-fira-sans tracking-tight text-foreground leading-tight">{notice.title}</h3>
                {permissions.canCreateNotices && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm shrink-0">
                    <NoticeActions id={notice.id} isPinned={notice.isPinned} />
                  </div>
                )}
              </div>
              
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-3xl font-medium">
                {notice.content}
              </p>

              {(notice as any).attachments && Array.isArray((notice as any).attachments) && (notice as any).attachments.length > 0 && (
                <div className="mt-4 space-y-3">
                  {(notice as any).attachments.map((url: string) => (
                    <FilePreview key={url} fileUrl={url} fileType={inferFileType(url)} fileName={url.split("/").pop()} />
                  ))}
                </div>
              )}
              
              {notice.expiresAt && !isPast && (
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="text-xs uppercase tracking-wider font-bold">Valid Until:</span>
                  {formatNepaliDateTime(notice.expiresAt)}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Notice Board</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Official department notices, academic announcements, and semester alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.canCreateNotices && (
            <Link className={`text-xs font-semibold px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer`} href="/notices/new">
              <Plus className="h-3.5 w-3.5" /> Post Notice
            </Link>
          )}
        </div>
      </div>

      {allNotices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 max-w-md mx-auto text-center border rounded-xl border-dashed bg-muted/5">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-2">
            <Megaphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold font-fira-sans tracking-tight">No Notices Available</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            There are currently no active administrative notices or broadcasts published.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6 w-full md:w-auto h-11 bg-muted/50 p-1 border rounded-xl">
            <TabsTrigger value="active" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Active ({activeNotices.length})</TabsTrigger>
            <TabsTrigger value="past" className="px-6 text-xs font-semibold uppercase tracking-wider font-fira-sans cursor-pointer rounded-lg">Archived ({pastNotices.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderNoticeList(activeNotices, false)}
          </TabsContent>
          
          <TabsContent value="past" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {renderNoticeList(pastNotices, true)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
