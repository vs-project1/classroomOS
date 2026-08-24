import type {
  CategoryInput,
  ComponentResult,
  GradeBand,
  GradeItem,
  SubjectGradeResult,
} from "./types";

interface CategoryStats {
  valuePct: number | null;
  itemCount: number;
  absentCount: number;
}

/**
 * Mean of (obtained / total * 100) over items with state "graded".
 *
 * Rules:
 * - "absent" items are excluded from numerator AND denominator (counted
 *   separately via {@link computeCategoryStats}.absentCount).
 * - "missing" items are excluded entirely.
 * - Items with total <= 0 are skipped entirely (never produce NaN).
 * - Returns null when no graded item qualifies.
 */
export function computeCategoryValue(items: GradeItem[]): number | null {
  return computeCategoryStats(items).valuePct;
}

/** Full stats for a set of grade items (value + graded/absent counts). */
export function computeCategoryStats(items: GradeItem[]): CategoryStats {
  let sum = 0;
  let gradedCount = 0;
  let absentCount = 0;

  for (const item of items) {
    if (item.state === "absent") {
      absentCount += 1;
      continue;
    }
    if (item.state !== "graded") continue; // missing: excluded entirely
    if (!(item.total > 0)) continue; // zero/invalid total: skipped, never NaN
    sum += (item.obtained / item.total) * 100;
    gradedCount += 1;
  }

  return {
    valuePct: gradedCount > 0 ? sum / gradedCount : null,
    itemCount: gradedCount,
    absentCount,
  };
}

function computeComponent(input: CategoryInput): ComponentResult {
  const stats = computeCategoryStats(input.items);
  return { category: input.category, ...stats };
}

/**
 * Round to 2 decimal places — the single rounding rule applied before band
 * lookup (floats stay unrounded everywhere else).
 */
export function round2(pct: number): number {
  return Math.round(pct * 100) / 100;
}

/**
 * Resolve a final percentage against a grade scale.
 * Bands are sorted desc by minPercent; first band where the rounded pct
 * clears minPercent wins. Below every configured band → explicit failing
 * fallback band ({ label: "F", gradePoint: 0, isPassing: false }).
 * Returns null when bands are not provided or pct is null/non-finite.
 */
export function resolveBand(
  pct: number | null,
  bands?: GradeBand[],
): GradeBand | null {
  if (!bands || bands.length === 0 || pct === null) return null;
  if (!Number.isFinite(pct)) return null;

  const rounded = round2(pct);
  const sorted = [...bands].sort((a, b) => b.minPercent - a.minPercent);
  for (const band of sorted) {
    if (rounded >= band.minPercent) return band;
  }
  return { label: "F", minPercent: 0, gradePoint: 0, isPassing: false };
}

/**
 * Weighted subject grade with weight renormalization.
 *
 * - Only categories with a non-null computed value AND weightPct > 0 count.
 * - finalPct renormalizes over available weights, so partial data still yields
 *   a meaningful percentage; `coverage` reports how much of the configured
 *   weight was actually backed by data.
 * - Never returns NaN anywhere.
 */
export function computeSubjectGrade(
  inputs: CategoryInput[],
  bands?: GradeBand[],
): SubjectGradeResult {
  const components = inputs.map(computeComponent);

  const availableIndices: number[] = [];
  inputs.forEach((input, i) => {
    if (components[i].valuePct !== null && input.weightPct > 0) {
      availableIndices.push(i);
    }
  });

  const coverage = availableIndices.reduce(
    (acc, i) => acc + inputs[i].weightPct,
    0,
  );

  let finalPct: number | null = null;
  if (availableIndices.length > 0) {
    const weightSum = availableIndices.reduce(
      (acc, i) => acc + inputs[i].weightPct,
      0,
    );
    // weightSum > 0 here because every available weight is strictly positive.
    let weightedSum = 0;
    for (const i of availableIndices) {
      weightedSum += (components[i].valuePct as number) * inputs[i].weightPct;
    }
    const computed = weightedSum / weightSum;
    finalPct = Number.isFinite(computed) ? computed : null;
  }

  const band = resolveBand(finalPct, bands);

  return {
    components,
    finalPct: finalPct === null ? null : round2(finalPct),
    coverage,
    bandLabel: band?.label ?? null,
    gradePoint: band?.gradePoint ?? null,
    isPassing: band?.isPassing ?? null,
  };
}
