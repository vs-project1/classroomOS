import { requireAuth } from "@/lib/auth/session";
import {
  getTelegramSettings,
  getSemesterTelegramConfigs,
  getTelegramBroadcastLogs,
} from "@/features/telegram/queries/telegram-queries";
import { BotSettingsCard } from "@/features/telegram/components/bot-settings-card";
import { SemesterConfigsTable } from "@/features/telegram/components/semester-configs-table";
import { BroadcastLogsTable } from "@/features/telegram/components/broadcast-logs-table";
import Link from "next/link";
import { ArrowLeft, Bot, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Telegram Bot Settings — Classroom OS",
};

export default async function AdminTelegramSettingsPage() {
  await requireAuth(["ADMIN"]);

  const [settings, configs, logs] = await Promise.all([
    getTelegramSettings(),
    getSemesterTelegramConfigs(),
    getTelegramBroadcastLogs(20),
  ]);

  const hasBotConfigured = Boolean(settings?.botToken && settings?.botUsername);

  return (
    <div className="flex-1 space-y-8 max-w-5xl mx-auto w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className={buttonVariants({ variant: "ghost", size: "sm" }) + " h-8 px-2 text-muted-foreground hover:text-foreground"}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Profile
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Integrations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-fira-sans tracking-tight text-foreground flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="w-6 h-6" />
            </span>
            Telegram Bot Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure automated morning (5:30 AM) and evening (8:00 PM) timetable briefings, and broadcast routine updates directly to class Telegram groups.
          </p>
        </div>
      </div>

      {/* Main Bot Settings Card */}
      <BotSettingsCard initialSettings={settings} />

      {/* Semester Channels Binding Table */}
      <SemesterConfigsTable configs={configs} hasBotConfigured={hasBotConfigured} />

      {/* Broadcast History & Logs */}
      <BroadcastLogsTable logs={logs} />
    </div>
  );
}
