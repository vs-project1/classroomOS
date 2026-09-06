"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2, ShieldAlert, Loader2, Bot } from "lucide-react";
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
import { broadcastNoticeToTelegramAction, type ActionResult } from "../actions/telegram-actions";

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

type BroadcastNoticeDialogProps = {
  noticeId: string;
  noticeTitle: string;
};

export function BroadcastNoticeDialog({
  noticeId,
  noticeTitle,
}: BroadcastNoticeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([...SEMESTERS]);
  const [pinMessage, setPinMessage] = useState(false);
  const [status, setStatus] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleSemester = (sem: string) => {
    if (selectedSemesters.includes(sem)) {
      setSelectedSemesters(selectedSemesters.filter((s) => s !== sem));
    } else {
      setSelectedSemesters([...selectedSemesters, sem]);
    }
  };

  const toggleAll = () => {
    if (selectedSemesters.length === SEMESTERS.length) {
      setSelectedSemesters([]);
    } else {
      setSelectedSemesters([...SEMESTERS]);
    }
  };

  const handleBroadcast = () => {
    if (selectedSemesters.length === 0) return;
    setStatus(null);
    startTransition(async () => {
      const res = await broadcastNoticeToTelegramAction({
        noticeId,
        semesters: selectedSemesters,
        pinMessage,
      });

      setStatus(res);
      if (res.success) {
        setTimeout(() => {
          setOpen(false);
          setStatus(null);
        }, 1500);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-primary hover:bg-primary/10 cursor-pointer"
            title="Broadcast notice to Telegram"
          >
            <Send className="h-4 w-4" />
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold font-fira-sans">
              Broadcast Notice to Telegram
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            Publish &ldquo;{noticeTitle}&rdquo; to the selected semester Telegram groups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Target Semesters:</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
            >
              {selectedSemesters.length === SEMESTERS.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {SEMESTERS.map((sem) => {
              const isChecked = selectedSemesters.includes(sem);
              return (
                <label
                  key={sem}
                  className={`flex items-center justify-center py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    isChecked
                      ? "bg-primary/10 text-primary border-primary/40 shadow-xs"
                      : "bg-muted/20 text-muted-foreground border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSemester(sem)}
                    className="sr-only"
                  />
                  <span>Sem {sem}</span>
                </label>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground pt-1">
            <input
              type="checkbox"
              checked={pinMessage}
              onChange={(e) => setPinMessage(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>📌 Pin this notice in the Telegram groups</span>
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
            disabled={isPending || selectedSemesters.length === 0}
            className="bg-primary text-primary-foreground font-semibold px-4 cursor-pointer gap-1.5 shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Broadcasting...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Broadcast ({selectedSemesters.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
