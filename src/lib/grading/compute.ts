import type { ExamType } from "@/db/schema";
import { letterForPct } from "./scale";

/**
 * Pure grade computation for the weighted gradebook.
 * NO IO here — callers fetch exam results + weights and pass plain arrays.
 *
 * Semantics (per docs/superpowers/plans/2026-08-24-phase1-gradebook.md):
 * - categoryPct[c] = ΣobtainedMarks / ΣtotalMarks over GRADED exams of category c.
 * - isAbsent → status "absent": excluded from numerator AND denominator, surfaced as "AB".
 * - obtainedMarks === null && !isAbsent → status "pending": excluded from both,
 *   never coerced to 0.
 * - finalPct = Σ(pct_c × w_c) / Σ(w_c), renormalized over categories with ≥1 graded exam.
 *   No graded exams at all → finalPct = null.
 */

export interface GradingExamResultInput {
  examId: string;
  category: ExamType;
  totalMarks: number;
  obtainedMarks: number | null;
  isAbsent: boolean;
}

export interface GradingWeightInput {
  category: ExamType;
  weightPct: number;
}

export type CategoryStatus = "graded" | "absent" | "pending";

export interface CategoryBreakdown {
  category: ExamType;
  /** Percentage 0-100; null when the category has no graded exams. */
  pct: number | null;
  /** Weight used in aggregation; 0 if no weight row exists for the subject. */
  weightPct: number;
  /** Number of graded exams contributing to pct. */
  gradedCount: number;
  /** Number of absent-marked exams (surfaced as "AB"). */
  absentCount: number;
  /** Number of pending (unmarked, not absent) exams. */
  pendingCount: number;
  status: CategoryStatus;
}

export interface SubjectGrade {
  /** Weighted percentage 0-100; null when nothing has been graded yet. */
  finalPct: number | null;
  categories: CategoryBreakdown[];
  letter: string;
}

const EXAM_CATEGORIES = [
  "unit_test",
  "midterm",
  "pre_board",
  "practical",
  "final",
] as const satisfies readonly ExamType[];

/**
 * Classify a single exam result against its exam metadata.
 */
function classify(
  result: GradingExamResultInput
): { status: CategoryStatus; obtained: number | null } {
  if (result.isAbsent) return { status: "absent", obtained: null };
  if (result.obtainedMarks === null) return { status: "pending", obtained: null };
  return { status: "graded", obtained: result.obtainedMarks };
}

/**
 * Compute a student's weighted grade for one subject.
 *
 * @param results All exam results for this student within the subject
 *                (joined with their exam's category + totalMarks).
 * @param weights The subject's configured category weights.
 */
export function computeSubjectGrade(
  results: readonly GradingExamResultInput[],
  weights: readonly GradingWeightInput[]
): SubjectGrade {
  const weightByCategory = new Map<ExamType, number>();
  for (const w of weights) {
    weightByCategory.set(w.category, w.weightPct);
  }

  // Bucket results by category so every declared category appears in output.
  const byCategory = new Map<ExamType, GradingExamResultInput[]>();
  for (const category of EXAM_CATEGORIES) {
    byCategory.set(category, []);
  }
  for (const result of results) {
    const bucket = byCategory.get(result.category);
    if (bucket) bucket.push(result);
  }

  const categories: CategoryBreakdown[] = [];

  for (const category of EXAM_CATEGORIES) {
    const bucket = byCategory.get(category)!;

    let obtainedSum = 0;
    let totalSum = 0;
    let gradedCount = 0;
    let absentCount = 0;
    let pendingCount = 0;

    for (const result of bucket) {
      const { status, obtained } = classify(result);
      if (status === "absent") {
        absentCount += 1;
        continue; // excluded from numerator AND denominator
      }
      if (status === "pending") {
        pendingCount += 1;
        continue; // excluded from both, never coerced to 0
      }
      gradedCount += 1;
      obtainedSum += obtained!;
      totalSum += result.totalMarks;
    }

    const weightPct = weightByCategory.get(category) ?? 0;
    const pct =
      gradedCount > 0 && totalSum > 0 ? (obtainedSum / totalSum) * 100 : null;

    categories.push({
      category,
      pct,
      weightPct,
      gradedCount,
      absentCount,
      pendingCount,
      status:
        gradedCount > 0 ? "graded" : absentCount > 0 ? "absent" : "pending",
    });
  }

  // Renormalized weighted average over categories having ≥1 graded exam.
  // Exact ratio math throughout — no premature rounding before classification
  // or letter lookup (standing priority #5).
  let weightedSum = 0;
  let weightSum = 0;
  for (const c of categories) {
    if (c.pct !== null && c.weightPct > 0) {
      weightedSum += c.pct * c.weightPct;
      weightSum += c.weightPct;
    }
  }
  const finalPct = weightSum > 0 ? weightedSum / weightSum : null;

  return {
    finalPct,
    categories,
    letter: finalPct === null ? "—" : letterForPct(finalPct),
  };
}
