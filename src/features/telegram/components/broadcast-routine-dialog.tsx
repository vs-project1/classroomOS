"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2, ShieldAlert, Loader2, Bot, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { broadcastRoutineToTelegramAction, type ActionResult } from "../actions/telegram-actions";

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

const WEEKDAYS = [
  { index: 0, label: "Sunday" },
  { index: 1, label: "Monday" },
  { index: 2, label: "Tuesday" },
  { index: 3, label: "Wednesday" },
  { index: 4, label: "Thursday" },
  { index: 5, label: "Friday" },
];

export type BroadcastRoutineDialogProps = {
  currentSemester: string;
  configuredSemesters: string[];
  hasBotToken: boolean;
  hasUnpublishedChanges?: boolean;
  unpublishedSemesters?: string[];
  triggerVariant?: "default" | "banner" | "compact";
};

export function BroadcastRoutineDialog({
  currentSemester,
  configuredSemesters,
  hasBotToken,
  hasUnpublishedChanges = false,
  unpublishedSemesters = [],
  triggerVariant = "default",
}: BroadcastRoutineDialogProps) {
  const [open, setOpen] = useState(false);

  // Pick the best default semester:
  // 1. If currently viewing a specific semester, use that
  // 2. Else if there's an unpublished semester, pick the first one
  // 3. Otherwise first configured semester or "I"
  const defaultSem =
    currentSemester !== "All" && SEMESTERS.includes(currentSemester as any)
      ? currentSemester
      : unpublishedSemesters[0] || configuredSemesters[0] || "I";

  const [semester, setSemester] = useState<string>(defaultSem);
  const [targetMode, setTargetMode] = useState<"tomorrow" | "today" | "custom">("tomorrow");
  const [customDayIndex, setCustomDayIndex] = useState<number>(1); // Monday default
  const [customNote, setCustomNote] = useState("");
  const [pinMessage, setPinMessage] = useState(false);
  const [isUpdateNotice, setIsUpdateNotice] = useState(
    hasUnpublishedChanges || unpublishedSemesters.includes(defaultSem)
  );

  const [status, setStatus] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCurrentSemConfigured = configuredSemesters.includes(semester);
  const isCurrentSemUnpublished = unpublishedSemesters.includes(semester);

  const handleSemesterChange = (newSem: string) => {
    setSemester(newSem);
    if (unpublishedSemesters.includes(newSem)) {
      setIsUpdateNotice(true);
    }
  };

  const handleBroadcast = () => {
    setStatus(null);
    startTransition(async () => {
      const now = new Date();
      const nptWeekday = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kathmandu",
        weekday: "short",
      }).format(now);
      const todayDayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nptWeekday);

      let targetDayOfWeek: number;
      if (targetMode === "custom") {
        targetDayOfWeek = customDayIndex;
      } else if (targetMode === "tomorrow") {
        targetDayOfWeek = (todayDayIndex + 1) % 7;
      } else {
        targetDayOfWeek = todayDayIndex;
      }

      const res = await broadcastRoutineToTelegramAction({
        semester: semester as any,
        targetDayOfWeek,
        customNote: customNote.trim() || undefined,
        pinMessage,
        isUpdate: isUpdateNotice,
      });

      setStatus(res);
      if (res.success) {
        setTimeout(() => {
          setOpen(false);
          setStatus(null);
          setCustomNote("");
        }, 1600);
      }
    });
  };

  const triggerButton = (() => {
    if (triggerVariant === "banner") {
      return (
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer gap-2 shadow-xs shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Publish Changes to Telegram</span>
        </Button>
      );
    }

    if (triggerVariant === "compact") {
      return (
        <Button
          variant={hasUnpublishedChanges ? "default" : "outline"}
          size="sm"
          className={
            hasUnpublishedChanges
              ? "bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-semibold cursor-pointer"
              : "gap-1.5 text-xs cursor-pointer"
          }
        >
          <Send className="w-3.5 h-3.5" />
          <span>{hasUnpublishedChanges ? "Publish Changes" : "Telegram"}</span>
        </Button>
      );
    }

    // Default variant
    if (hasUnpublishedChanges) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-semibold cursor-pointer shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <Send className="w-3.5 h-3.5" />
          <span>Publish Routine Changes</span>
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shadow-xs"
      >
        <Send className="w-3.5 h-3.5" />
        <span>Broadcast to Telegram</span>
      </Button>
    );
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerButton} />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold font-fira-sans">
              {isUpdateNotice ? "Publish Routine Changes" : "Broadcast Routine to Telegram"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Instantly dispatch the timetable to the semester's Telegram channel. Only sent when you click Publish.
          </DialogDescription>
        </DialogHeader>

        {!hasBotToken ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-2">
            <p className="font-semibold">⚠️ Telegram Bot is not configured yet.</p>
            <p>Go to Admin Settings to configure the bot token and connect semester chats.</p>
            <a
              href="/admin/settings/telegram"
              className="inline-block text-xs font-bold underline hover:opacity-80"
            >
              Open Telegram Settings →
            </a>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Unpublished Changes Alert Banner */}
            {isCurrentSemUnpublished && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unpublished timetable changes detected!</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Modifications to Semester {semester} will be broadcasted as a revised routine announcement.
                  </p>
                </div>
              </div>
            )}

            {/* Semester Select */}
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-sem" className="text-xs font-semibold">
                Select Semester
              </Label>
              <select
                id="broadcast-sem"
                value={semester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                {SEMESTERS.map((s) => {
                  const isLinked = configuredSemesters.includes(s);
                  const isUnpub = unpublishedSemesters.includes(s);
                  let statusTag = "";
                  if (isUnpub) statusTag = "⚠️ Changes Pending";
                  else if (isLinked) statusTag = "✓ Connected";
                  else statusTag = "No Chat Linked";

                  return (
                    <option key={s} value={s}>
                      Semester {s} ({statusTag})
                    </option>
                  );
                })}
              </select>
              {!isCurrentSemConfigured && (
                <p className="text-[11px] text-destructive">
                  ⚠️ No Telegram chat linked for Semester {semester}.{" "}
                  <a href="/admin/settings/telegram" className="underline font-semibold">
                    Link chat in settings →
                  </a>
                </p>
              )}
            </div>

            {/* Update Notice Toggle */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
              <label className="flex items-start gap-2 text-xs font-medium cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={isUpdateNotice}
                  onChange={(e) => setIsUpdateNotice(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="font-semibold text-xs">Send as "⚠️ Routine Changed Notice"</span>
                  <p className="text-[11px] text-muted-foreground">
                    Adds high-visibility update badges to the message so students immediately notice the revision.
                  </p>
                </div>
              </label>
            </div>

            {/* Target Day */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Schedule Target</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode("tomorrow")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    targetMode === "tomorrow"
                      ? "bg-primary/10 text-primary border-primary/40 font-semibold shadow-xs"
                      : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                  }`}
                >
                  🌙 Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("today")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    targetMode === "today"
                      ? "bg-primary/10 text-primary border-primary/40 font-semibold shadow-xs"
                      : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                  }`}
                >
                  🌅 Today
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("custom")}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    targetMode === "custom"
                      ? "bg-primary/10 text-primary border-primary/40 font-semibold shadow-xs"
                      : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                  }`}
                >
                  📅 Pick Day
                </button>
              </div>

              {targetMode === "custom" && (
                <div className="pt-2">
                  <select
                    value={customDayIndex}
                    onChange={(e) => setCustomDayIndex(Number(e.target.value))}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.index} value={d.index}>
                        {d.label}'s Schedule
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Custom Announcement Note */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-note" className="text-xs font-semibold">
                Custom Announcement Note (Optional)
              </Label>
              <Textarea
                id="custom-note"
                placeholder={
                  isUpdateNotice
                    ? "e.g. Computer Graphics shifted to 08:30 AM in Room 302."
                    : "e.g. Lab reports due tomorrow. Period 2 starts in Room 301."
                }
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="text-xs min-h-[65px]"
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground">
                Appended to the timetable card in Telegram as a highlighted note.
              </p>
            </div>

            {/* Pin Message Toggle */}
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={pinMessage}
                onChange={(e) => setPinMessage(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>📌 Pin this announcement in the Telegram group</span>
            </label>

            {status && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  status.success
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {status.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                )}
                <span>{status.success ? status.message : status.error}</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="cursor-pointer text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleBroadcast}
            disabled={isPending || !hasBotToken || !isCurrentSemConfigured}
            className={`font-semibold px-4 cursor-pointer gap-1.5 shadow-xs ${
              isUpdateNotice
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Broadcasting...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{isUpdateNotice ? "Publish & Alert Group" : "Publish & Broadcast"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
