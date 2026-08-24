import type { GradeCategory } from "./types";

/** Canonical ordering of grade categories (display order). */
export const GRADE_CATEGORIES: readonly GradeCategory[] = [
  "homework",
  "unit_test",
  "midterm",
  "pre_board",
  "practical",
  "final",
] as const;

/**
 * Default per-category weights (%). Sum = 100.
 * `pre_board` defaults to 0 (opt-in via subject weight editor).
 */
export const DEFAULT_WEIGHTS: Record<GradeCategory, number> = {
  homework: 20,
  unit_test: 20,
  midterm: 20,
  pre_board: 0,
  practical: 10,
  final: 30,
};
