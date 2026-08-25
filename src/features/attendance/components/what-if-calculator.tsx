"use client";

import { useState } from "react";
import { projectAttendance } from "@/lib/attendance";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface WhatIfCalculatorProps {
  initialAttended: number;
  initialTotal: number;
}

export function WhatIfCalculator({ initialAttended, initialTotal }: WhatIfCalculatorProps) {
  const [plannedAttended, setPlannedAttended] = useState<number>(0);
  const [plannedMissed, setPlannedMissed] = useState<number>(0);

  const projected = projectAttendance(initialAttended, initialTotal, plannedAttended, plannedMissed);

  const statusColor =
    projected.category === "SAFE"
      ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-800"
      : projected.category === "CAUTION"
      ? "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800"
      : "text-destructive bg-destructive/10 border-destructive/20";

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base">What-If Projection Simulator</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
            {projected.category}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Simulate how attending or missing future lectures will dynamically shift your TU 80% examination eligibility.
        </p>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label htmlFor="what-if-attend" className="flex justify-between text-xs font-medium mb-1.5 cursor-pointer">
              <span>Future Classes to Attend</span>
              <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">+{plannedAttended} classes</span>
            </label>
            <input
              id="what-if-attend"
              aria-label="Future Classes to Attend"
              type="range"
              min="0"
              max="20"
              step="1"
              value={plannedAttended}
              data-testid="what-if-slider"
              onChange={(e) => setPlannedAttended(parseInt(e.target.value, 10) || 0)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="what-if-miss" className="flex justify-between text-xs font-medium mb-1.5 cursor-pointer">
              <span>Future Classes to Miss</span>
              <span className="font-bold tabular-nums text-destructive">+{plannedMissed} missed</span>
            </label>
            <input
              id="what-if-miss"
              aria-label="Future Classes to Miss"
              type="range"
              min="0"
              max="20"
              step="1"
              value={plannedMissed}
              data-testid="what-if-slider-missed"
              onChange={(e) => setPlannedMissed(parseInt(e.target.value, 10) || 0)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-destructive"
            />
          </div>
        </div>
      </div>

      {/* Projection Output */}
      <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground block font-medium">Projected Percentage</span>
          <span
            data-testid="what-if-projected-result"
            className="text-3xl font-bold tabular-nums tracking-tight text-foreground"
          >
            {projected.percentage}%
          </span>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-xs font-bold mb-0.5">
            {projected.percentageDelta > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{projected.percentageDelta}%
              </span>
            ) : projected.percentageDelta < 0 ? (
              <span className="text-destructive flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> {projected.percentageDelta}%
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Minus className="w-3.5 h-3.5" /> 0%
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {projected.category === "SAFE"
              ? `+${projected.missableSessions} missable classes`
              : `Need ${projected.classesNeededToRecover} classes to recover`}
          </span>
        </div>
      </div>
    </div>
  );
}
