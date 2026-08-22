import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Check } from "lucide-react";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  dateStyle: "medium",
  timeStyle: "short",
});

function isSafeLink(link: string | null): link is string {
  return Boolean(link && link.startsWith("/"));
}

export default async function NotificationsPage() {
  const user = await requireAuth(["STUDENT", "CR", "TEACHER", "ADMIN"]);

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unreadCount = rows.filter((row) => !row.isRead).length;

  return (
    <div className="flex-1 space-y-8 max-w-5xl">
      <div className="pb-6 border-b border-border/40">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">Recent alerts about assignments, attendance, notices, exams, and corrections.</p>
          </div>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead} className="shrink-0 pt-1.5">
              <button type="submit" className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-xl" })}>
                Mark all as read
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            You&apos;re all caught up.
          </div>
        ) : (
          rows.map((row) => {
            const safeLink = isSafeLink(row.link) ? row.link : null;
            const cardClasses = cn(
              "block p-5 rounded-xl border transition-colors",
              row.isRead ? "bg-card opacity-75" : "bg-primary/5",
              safeLink && "hover:bg-muted/30"
            );

            const body = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {!row.isRead && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <h3 className="font-semibold">{row.title}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {row.type.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{row.message}</p>
                <p className="mt-2 text-xs text-muted-foreground/80">{dateTimeFormatter.format(row.createdAt)}</p>
              </>
            );

            if (safeLink) {
              return (
                <Link key={row.id} href={safeLink} className={cardClasses}>
                  {body}
                </Link>
              );
            }

            return (
              <div key={row.id} className={cn(cardClasses, "group")}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">{body}</div>
                  {!row.isRead && (
                    <form action={markNotificationRead.bind(null, row.id)} className="shrink-0">
                      <button
                        type="submit"
                        title="Mark as read"
                        className={buttonVariants({ variant: "ghost", size: "xs", className: "gap-1 text-muted-foreground hover:text-foreground" })}
                      >
                        <Check /> Mark read
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
