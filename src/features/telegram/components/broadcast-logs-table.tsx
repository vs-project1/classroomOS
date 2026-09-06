import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNepaliDateTime } from "@/lib/nepali-date";
import { CheckCircle2, History, XCircle } from "lucide-react";
import type { TelegramBroadcastLog, User } from "@/db/schema";

type BroadcastLogWithSender = TelegramBroadcastLog & {
  sender?: User | null;
};

export function BroadcastLogsTable({ logs }: { logs: BroadcastLogWithSender[] }) {
  if (logs.length === 0) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold font-fira-sans text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Recent Telegram Broadcasts
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Audit history of automated briefings and manual announcements sent to Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-xs text-muted-foreground">
          No broadcast messages sent yet. Broadcast a routine or send a test message to see it logged here.
        </CardContent>
      </Card>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "morning_brief":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">🌅 Morning Brief</span>;
      case "evening_brief":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">🌙 Evening Brief</span>;
      case "routine_broadcast":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">📅 Routine Change</span>;
      case "notice_broadcast":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">📢 Notice</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">Test Broadcast</span>;
    }
  };

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/40 pb-4">
        <CardTitle className="text-base font-bold font-fira-sans text-foreground flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Recent Telegram Broadcasts
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Audit trail of automated routines and manual notifications sent to Telegram groups.
        </CardDescription>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/30 border-b border-border/40 text-muted-foreground font-semibold">
            <tr>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Semester</th>
              <th className="py-2.5 px-4">Sender / Trigger</th>
              <th className="py-2.5 px-4">Sent At (NPT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-4">
                  {log.status === "success" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-destructive" title={log.errorMessage || ""}>
                      <XCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">{getTypeBadge(log.type)}</td>
                <td className="py-3 px-4 font-bold text-foreground">Sem {log.semester}</td>
                <td className="py-3 px-4 text-muted-foreground">
                  {log.sender?.email || "Automated Cron Engine"}
                </td>
                <td className="py-3 px-4 text-muted-foreground font-fira-code text-[11px]">
                  {formatNepaliDateTime(log.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
