"use client";

import { useState, useTransition } from "react";
import { upsertWeights, type GradeActionResult } from "@/features/grades/actions/grade-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS } from "@/components/grades/labels";

/**
 * Per-subject category weight editor. Validates the sum-to-100 invariant
 * inline before calling the `upsertWeights` server action.
 */
export function WeightEditor({
  subjectId,
  subjectName,
  subjectCode,
  initialWeights,
}: {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  /** category → weightPct (categories without a stored row default to 0). */
  initialWeights: Record<string, number>;
}) {
  const categories = Object.keys(CATEGORY_LABELS);
  const [weights, setWeights] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c, String(initialWeights[c] ?? 0)]))
  );
  const [result, setResult] = useState<GradeActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = categories.map((c) => ({
    category: c,
    value: Number.parseInt(weights[c], 10),
  }));
  const allValid = parsed.every((p) => Number.isInteger(p.value) && p.value >= 0 && p.value <= 100);
  const sum = parsed.reduce((acc, p) => acc + (Number.isInteger(p.value) ? p.value : 0), 0);
  const sumInvalid = sum !== 100;

  const canSave = allValid && !sumInvalid && !isPending;

  function handleSave() {
    if (!canSave) return;
    startTransition(async () => {
      const actionResult = await upsertWeights(
        subjectId,
        parsed.map((p) => ({ category: p.category, weightPct: p.value }))
      );
      setResult(actionResult);
    });
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground leading-tight">
          {subjectName}
        </h4>
        <span className="text-xs font-bold uppercase font-fira-code text-primary shrink-0">
          {subjectCode}
        </span>
      </div>

      <div className="space-y-1.5">
        {parsed.map(({ category, value }) => (
          <div key={category} className="flex items-center gap-2">
            <label
              htmlFor={`weight-${subjectId}-${category}`}
              className="flex-1 text-xs text-muted-foreground"
            >
              {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
            </label>
            <Input
              id={`weight-${subjectId}-${category}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={weights[category]}
              onChange={(e) => {
                setWeights((prev) => ({ ...prev, [category]: e.target.value }));
                setResult(null);
              }}
              aria-invalid={!Number.isInteger(value) || value < 0 || value > 100 || undefined}
              className="w-16 h-7 text-right font-fira-code text-xs"
            />
            <span className="text-xs text-muted-foreground w-3">%</span>
          </div>
        ))}
      </div>

      {sumInvalid ? (
        <p role="alert" className="text-xs text-destructive font-medium">
          Weights must sum to 100 (got {sum}).
        </p>
      ) : result && !result.ok ? (
        <p role="alert" className="text-xs text-destructive font-medium">
          {result.error}
        </p>
      ) : result?.ok ? (
        <p className="text-xs text-primary font-medium">Weights saved.</p>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        disabled={!canSave}
        className="w-full"
      >
        {isPending ? "Saving…" : "Save Weights"}
      </Button>
    </div>
  );
}
