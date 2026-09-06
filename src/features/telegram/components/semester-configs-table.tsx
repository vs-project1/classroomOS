"use client";

import { useState, useTransition } from "react";
import { Check, CheckCircle2, HelpCircle, Loader2, MessageSquare, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveSemesterTelegramConfigAction,
  sendTestTelegramMessageAction,
  type ActionResult,
} from "../actions/telegram-actions";
import type { SemesterTelegramConfig } from "@/db/schema";

const ALL_SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

type SemesterConfigsTableProps = {
  configs: SemesterTelegramConfig[];
  hasBotConfigured: boolean;
};

export function SemesterConfigsTable({ configs, hasBotConfigured }: SemesterConfigsTableProps) {
  const [activeTab, setActiveTab] = useState<string>("I");
  const [showGuide, setShowGuide] = useState(false);

  // Map existing configs by semester
  const configMap = new Map<string, SemesterTelegramConfig>();
  configs.forEach((c) => configMap.set(c.semester, c));

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border/40 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold font-fira-sans tracking-tight text-foreground flex items-center gap-2">
              Semester Telegram Channels
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Bind each semester (Sem I to Sem VIII) to its dedicated Telegram Group, Channel, or Forum Topic Thread.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowGuide(!showGuide)}
            className="text-xs text-primary gap-1.5 cursor-pointer w-fit"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showGuide ? "Hide Setup Guide" : "How to find Chat ID?"}
          </Button>
        </div>

        {showGuide && (
          <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-2 leading-relaxed">
            <p className="font-semibold text-foreground">📌 3 Quick Steps to Connect a Telegram Group:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Create or open your class Telegram Group/Channel and <b>add your bot as an Admin</b>.</li>
              <li>
                Add <code>@RawDataBot</code> or <code>@userinfobot</code> to the group temporarily to get the <b>Chat ID</b> (e.g. <code>-100...</code>, <code>-123456789</code>, or an <code>@channel</code> handle).
              </li>
              <li>
                Paste the ID below and click <b>"Send Test Broadcast"</b> to verify! (If you use Telegram Supergroup Forums, enter the <b>Topic Thread ID</b> as well).
              </li>
            </ol>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Semester Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-border/30">
          {ALL_SEMESTERS.map((sem) => {
            const conf = configMap.get(sem);
            const isConfigured = Boolean(conf?.chatId);
            const isSelected = activeTab === sem;
            return (
              <button
                key={sem}
                type="button"
                onClick={() => setActiveTab(sem)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Sem {sem}</span>
                {isConfigured && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-emerald-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Form for Active Semester */}
        {ALL_SEMESTERS.map((sem) => {
          if (activeTab !== sem) return null;
          const conf = configMap.get(sem);
          return (
            <SemesterRowForm
              key={sem}
              semester={sem}
              initialConfig={conf ?? null}
              hasBotConfigured={hasBotConfigured}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function SemesterRowForm({
  semester,
  initialConfig,
  hasBotConfigured,
}: {
  semester: string;
  initialConfig: SemesterTelegramConfig | null;
  hasBotConfigured: boolean;
}) {
  const [chatId, setChatId] = useState(initialConfig?.chatId || "");
  const [chatTitle, setChatTitle] = useState(initialConfig?.chatTitle || "");
  const [threadId, setThreadId] = useState(
    initialConfig?.messageThreadId ? String(initialConfig.messageThreadId) : ""
  );
  const [autoMorning, setAutoMorning] = useState(initialConfig?.autoMorningBrief ?? true);
  const [autoEvening, setAutoEvening] = useState(initialConfig?.autoEveningBrief ?? true);
  const [autoNotices, setAutoNotices] = useState(initialConfig?.autoNotices ?? true);

  const [saveStatus, setSaveStatus] = useState<ActionResult | null>(null);
  const [isSaving, startSaving] = useTransition();

  const [testStatus, setTestStatus] = useState<ActionResult | null>(null);
  const [isTesting, startTesting] = useTransition();

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveStatus(null);
    const formData = new FormData(e.currentTarget);
    formData.set("semester", semester);
    formData.set("autoMorningBrief", autoMorning ? "on" : "off");
    formData.set("autoEveningBrief", autoEvening ? "on" : "off");
    formData.set("autoNotices", autoNotices ? "on" : "off");

    startSaving(async () => {
      const res = await saveSemesterTelegramConfigAction(null, formData);
      setSaveStatus(res);
    });
  };

  const handleSendTest = () => {
    setTestStatus(null);
    startTesting(async () => {
      const res = await sendTestTelegramMessageAction(semester);
      setTestStatus(res);
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-foreground">Semester {semester}</span>
          {initialConfig?.chatId ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active Channel
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Not Connected
            </span>
          )}
        </div>

        {initialConfig?.chatId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={isTesting || !hasBotConfigured}
            className="text-xs gap-1.5 cursor-pointer"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-primary" />
            )}
            Send Test Broadcast
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Telegram Chat / Group ID <span className="text-destructive">*</span>
          </label>
          <Input
            name="chatId"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-123456789 or -100123456789"
            className="font-fira-code text-xs"
            required
          />
          <p className="text-[11px] text-muted-foreground">Any ID format works (e.g. -123456789, -100..., or @channel)</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Channel Title / Label</label>
          <Input
            name="chatTitle"
            value={chatTitle}
            onChange={(e) => setChatTitle(e.target.value)}
            placeholder="e.g. BCA Sem IV Official"
            className="text-xs"
          />
          <p className="text-[11px] text-muted-foreground">Internal reference label</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Topic Thread ID (Optional)</label>
          <Input
            name="messageThreadId"
            type="number"
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            placeholder="e.g. 14"
            className="font-fira-code text-xs"
          />
          <p className="text-[11px] text-muted-foreground">For Forum Supergroups</p>
        </div>
      </div>

      {/* Delivery Toggles */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
        <span className="text-xs font-semibold text-foreground block">
          Automated Broadcast Toggles for Semester {semester}:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={autoMorning}
              onChange={(e) => setAutoMorning(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>🌅 5:30 AM Today's Routine</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={autoEvening}
              onChange={(e) => setAutoEvening(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>🌙 8:00 PM Tomorrow's Brief</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={autoNotices}
              onChange={(e) => setAutoNotices(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>📢 Campus Notices</span>
          </label>
        </div>
      </div>

      {saveStatus && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            saveStatus.success
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {saveStatus.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          )}
          <span>{saveStatus.success ? saveStatus.message : saveStatus.error}</span>
        </div>
      )}

      {testStatus && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            testStatus.success
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {testStatus.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          )}
          <span>{testStatus.success ? testStatus.message : testStatus.error}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          size="sm"
          className="bg-primary text-primary-foreground font-semibold px-5 cursor-pointer shadow-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
            </>
          ) : (
            <>Save Semester {semester} Channel</>
          )}
        </Button>
      </div>
    </form>
  );
}
