import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Inbox, Loader2, XCircle } from "lucide-react";
import type { TelegramOutboxStats } from "../services/telegram-outbox-service";

export function OutboxQueueCard({ stats }: { stats: TelegramOutboxStats }) {
  return (
    <Card className="rounded-2xl border border-border bg-card shadow-xs">
      <CardHeader className="border-b border-border/40 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold font-fira-sans text-foreground flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              Delivery Outbox Queue
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Decoupled background dispatcher ensuring non-blocking broadcasts with automatic rate-limit pacing and retry backoff.
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {stats.total} Total
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Pending</p>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                {stats.pending}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <Loader2 className={`w-4 h-4 text-blue-500 shrink-0 ${stats.processing > 0 ? "animate-spin" : ""}`} />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Processing</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                {stats.processing}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Completed</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Failed</p>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                {stats.failed}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
