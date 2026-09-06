"use client";

import { useState, useTransition } from "react";
import { Bot, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  saveTelegramSettingsAction,
  testBotConnectionAction,
  sendDirectTestMessageAction,
  type ActionResult,
} from "../actions/telegram-actions";
import type { TelegramSettings } from "@/db/schema";

type BotSettingsCardProps = {
  initialSettings: TelegramSettings | null;
};

export function BotSettingsCard({ initialSettings }: BotSettingsCardProps) {
  const [showToken, setShowToken] = useState(false);
  const [botToken, setBotToken] = useState(initialSettings?.botToken || "");
  const [isEnabled, setIsEnabled] = useState(initialSettings?.isEnabled ?? true);
  const [morningTime, setMorningTime] = useState(initialSettings?.morningBriefTime || "05:30");
  const [eveningTime, setEveningTime] = useState(initialSettings?.eveningBriefTime || "20:00");
  const [weekendDays, setWeekendDays] = useState<number[]>(
    initialSettings?.weekendDays || [0, 6]
  );

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, startTesting] = useTransition();

  const [testChatId, setTestChatId] = useState("");
  const [messageResult, setMessageResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSendingMessage, startSendingMessage] = useTransition();

  const [saveResult, setSaveResult] = useState<ActionResult | null>(null);
  const [isSaving, startSaving] = useTransition();

  const handleSendDirectTest = () => {
    setMessageResult(null);
    startSendingMessage(async () => {
      const res = await sendDirectTestMessageAction({
        chatId: testChatId,
        botToken: botToken.trim() || undefined,
      });
      setMessageResult({
        success: res.success,
        message: res.success ? (res.message || "Message delivered!") : (res.error || "Failed to send"),
      });
    });
  };

  const handleTestConnection = () => {
    setTestResult(null);
    startTesting(async () => {
      const res = await testBotConnectionAction(botToken);
      if (res.success) {
        setTestResult({
          success: true,
          message: `Connected successfully as @${res.data?.username}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || "Connection test failed",
        });
      }
    });
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveResult(null);
    const formData = new FormData(e.currentTarget);
    formData.set("isEnabled", String(isEnabled));

    startSaving(async () => {
      const res = await saveTelegramSettingsAction(null, formData);
      setSaveResult(res);
    });
  };

  const toggleWeekendDay = (day: number) => {
    if (weekendDays.includes(day)) {
      setWeekendDays(weekendDays.filter((d) => d !== day));
    } else {
      setWeekendDays([...weekendDays, day].sort());
    }
  };

  const isConnected = Boolean(initialSettings?.botToken && initialSettings?.botUsername);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/40 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold font-fira-sans tracking-tight text-foreground flex items-center gap-2">
                Central Telegram Bot
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    @{initialSettings?.botUsername}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Not Configured
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Configure your college Telegram bot to deliver automated routine briefings and urgent campus notices.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
            <Label htmlFor="master-toggle" className="text-xs font-medium cursor-pointer">
              {isEnabled ? "Bot Active" : "Bot Paused"}
            </Label>
            <Switch
              id="master-toggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              className="cursor-pointer"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Bot Token Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="botToken" className="text-sm font-semibold">
                Bot Token <span className="text-destructive">*</span>
              </Label>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline font-medium"
              >
                Create bot with @BotFather →
              </a>
            </div>

            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="botToken"
                  name="botToken"
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className="pr-10 font-fira-code text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting || !botToken.trim()}
                className="shrink-0 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Test Connection
                  </>
                )}
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  testResult.success
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Quick Live Test Message Sender */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-3">
            <div>
              <Label htmlFor="testChatId" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-primary" />
                Send Instant Test Message to a Group / Chat
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Enter your Telegram Chat ID below to verify that your bot can post a message into your group right now.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                id="testChatId"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="Enter Chat ID (e.g. -123456789, -100..., or @channel)"
                className="font-fira-code text-xs flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSendDirectTest}
                disabled={isSendingMessage || !testChatId.trim()}
                className="shrink-0 gap-1.5 cursor-pointer text-xs font-semibold w-full sm:w-auto"
              >
                {isSendingMessage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-primary" /> Send Test Message
                  </>
                )}
              </Button>
            </div>

            {messageResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  messageResult.success
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {messageResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                )}
                <span>{messageResult.message}</span>
              </div>
            )}
          </div>

          {/* Schedule Briefing Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label htmlFor="morningBriefTime" className="text-xs font-semibold">
                🌅 Morning Routine Broadcast Time
              </Label>
              <Input
                id="morningBriefTime"
                name="morningBriefTime"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="font-fira-code text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Sent every class day (e.g. 05:30 AM Nepal Time).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eveningBriefTime" className="text-xs font-semibold">
                🌙 Evening Next-Day Briefing Time
              </Label>
              <Input
                id="eveningBriefTime"
                name="eveningBriefTime"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="font-fira-code text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Sent the night before at 8:00 PM so students can prepare.
              </p>
            </div>
          </div>

          {/* Weekend Configuration (Sat & Sun off) */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-semibold block">
              🏖️ College Weekend Days (Zero-Spam Days)
            </Label>
            <p className="text-[11px] text-muted-foreground mb-3">
              The bot stays completely silent during these days, only waking up on the final evening to send the Monday briefing.
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { day: 0, label: "Sunday" },
                { day: 5, label: "Friday" },
                { day: 6, label: "Saturday" },
              ].map(({ day, label }) => {
                const isChecked = weekendDays.includes(day);
                return (
                  <label
                    key={day}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      isChecked
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/20 text-muted-foreground border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="weekendDays"
                      value={day}
                      checked={isChecked}
                      onChange={() => toggleWeekendDay(day)}
                      className="sr-only"
                    />
                    <span>{label} (Off)</span>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </label>
                );
              })}
            </div>
          </div>

          {saveResult && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                saveResult.success
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {saveResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              )}
              <span>{saveResult.success ? saveResult.message : saveResult.error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground font-semibold px-6 shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Settings...
                </>
              ) : (
                <>Save Bot Configuration</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
