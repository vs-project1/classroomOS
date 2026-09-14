"use client";

import { useState, useTransition } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Loader2,
  Play,
  Server,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { triggerTelegramBriefAction, type ActionResult } from "../actions/telegram-actions";
import type { TelegramSettings, SemesterTelegramConfig } from "@/db/schema";

type CronAutomationCardProps = {
  settings: TelegramSettings | null;
  configs: SemesterTelegramConfig[];
};

export function CronAutomationCard({ settings, configs }: CronAutomationCardProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("ALL");
  const [triggerResult, setTriggerResult] = useState<ActionResult<any> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showGuide, setShowGuide] = useState(false);

  const cronSecret = settings?.cronSecret || "";
  const isEnabled = settings?.isEnabled ?? false;
  const morningTime = settings?.morningBriefTime || "05:30";
  const eveningTime = settings?.eveningBriefTime || "20:00";

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTrigger = (briefType: "morning" | "evening") => {
    setTriggerResult(null);
    startTransition(async () => {
      const sem = selectedSemester === "ALL" ? undefined : selectedSemester;
      const res = await triggerTelegramBriefAction({
        briefType,
        semester: sem,
        force: true, // Manual test bypasses deduplication and weekend suppression
      });
      setTriggerResult(res);
    });
  };

  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const cronUrl = `${currentOrigin}/api/cron/telegram-brief`;
  const curlExample = `curl -X POST "${cronUrl}?type=morning" -H "Authorization: Bearer ${cronSecret}"`;
  const pingerUrl = `${cronUrl}?type=morning&secret=${cronSecret}`;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/40 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold font-fira-sans tracking-tight text-foreground flex items-center gap-2">
                Automated Routine Engine & Cron Webhook
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Classroom OS schedules routine broadcasts at {morningTime} AM (Morning) and {eveningTime} (Evening) Nepal Time.
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-primary gap-1.5 cursor-pointer w-fit"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showGuide ? "Hide Setup Guide" : "How does automation work?"}
          </Button>
        </div>

        {showGuide && (
          <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-3 leading-relaxed">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Server className="w-4 h-4 text-primary" />
              How Routine Automation Operates Across Environments:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-background/80 border border-border/40 space-y-1">
                <p className="font-semibold text-foreground">1. Local & Node Server</p>
                <p className="text-[11px]">
                  An in-process scheduler runs automatically while the server process is alive, checking the clock every minute and dispatching briefings on schedule.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/40 space-y-1">
                <p className="font-semibold text-foreground">2. Vercel Cloud (Cron)</p>
                <p className="text-[11px]">
                  Configured via <code>vercel.json</code>. Vercel triggers <code>/api/cron/telegram-brief</code> at 23:45 UTC (05:30 NPT) and 14:15 UTC (20:00 NPT).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/40 space-y-1">
                <p className="font-semibold text-foreground">3. Free Pingers (cron-job.org)</p>
                <p className="text-[11px]">
                  Use the Webhook URL below with your Secret in any free scheduler to reliably trigger briefings without configuring headers.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Live Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/60">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                isEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <div>
              <p className="text-sm font-bold text-foreground">
                Automation Status: {isEnabled ? "Active & Ready" : "Bot Disabled"}
              </p>
              <p className="text-xs text-muted-foreground">
                Morning Schedule: <span className="font-semibold text-foreground">{morningTime} NPT</span> • Evening Schedule: <span className="font-semibold text-foreground">{eveningTime} NPT</span>
              </p>
            </div>
          </div>

          {/* On-Demand Trigger Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground font-medium cursor-pointer"
            >
              <option value="ALL">All Configured Semesters</option>
              {configs
                .filter((c) => Boolean(c.chatId))
                .map((c) => (
                  <option key={c.id} value={c.semester}>
                    Semester {c.semester}
                  </option>
                ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTrigger("morning")}
              disabled={isPending || !isEnabled}
              className="gap-1.5 cursor-pointer text-xs font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 text-amber-500" />
              )}
              Trigger Morning Brief Now
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTrigger("evening")}
              disabled={isPending || !isEnabled}
              className="gap-1.5 cursor-pointer text-xs font-semibold"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 text-indigo-500" />
              )}
              Trigger Evening Brief Now
            </Button>
          </div>
        </div>

        {/* Trigger Outcome Alert */}
        {triggerResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
              triggerResult.success
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {triggerResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">
                {triggerResult.success ? triggerResult.message : triggerResult.error}
              </p>
              {triggerResult.success && triggerResult.data?.summary && (
                <p className="text-[11px] opacity-90">{triggerResult.data.summary}</p>
              )}
            </div>
          </div>
        )}

        {/* Webhook Endpoint & Secret Info */}
        <div className="space-y-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" />
              Cron Webhook Endpoint
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={cronUrl}
                className="font-fira-code text-xs bg-muted/40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy("url", cronUrl)}
                className="shrink-0 gap-1.5 cursor-pointer"
              >
                {copiedKey === "url" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Accepts GET or POST requests with <code>?type=morning</code> or <code>?type=evening</code>.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Cron Secret Token
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  type={showSecret ? "text" : "password"}
                  value={cronSecret}
                  className="font-fira-code text-xs bg-muted/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy("secret", cronSecret)}
                className="shrink-0 gap-1.5 cursor-pointer"
              >
                {copiedKey === "secret" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Secret
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Ready-to-Use Webhook URL */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
            <Label className="text-[11px] font-bold text-foreground block">
              🔗 Simple Webhook URL (For cron-job.org / External Schedulers):
            </Label>
            <div className="flex items-center gap-2">
              <code className="text-[11px] font-fira-code bg-background/90 p-2 rounded-lg border border-border/50 flex-1 truncate select-all">
                {pingerUrl}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy("pinger", pingerUrl)}
                className="shrink-0 gap-1 cursor-pointer text-xs h-8"
              >
                {copiedKey === "pinger" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                Copy URL
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
