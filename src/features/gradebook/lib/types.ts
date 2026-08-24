export type GradeCategory =
  | "homework"
  | "unit_test"
  | "midterm"
  | "pre_board"
  | "practical"
  | "final";

export type GradeDisplayMode = "percentage" | "letter" | "gpa";

export type GradeItemState = "graded" | "absent" | "missing";

export interface GradeItem {
  label: string;
  obtained: number;
  total: number;
  state: GradeItemState;
}

export interface CategoryInput {
  category: GradeCategory;
  weightPct: number;
  items: GradeItem[];
}

export interface ComponentResult {
  category: GradeCategory;
  /** Mean percentage over graded items, or null when nothing was graded. */
  valuePct: number | null;
  /** Number of graded items included in the mean. */
  itemCount: number;
  /** Number of items explicitly marked absent (excluded from the mean). */
  absentCount: number;
}

export interface SubjectGradeResult {
  components: ComponentResult[];
  finalPct: number | null;
  /** Percentage (0–100) of configured weight backed by actual data. */
  coverage: number;
  bandLabel: string | null;
  gradePoint: number | null;
  isPassing: boolean | null;
}

export interface GradeBand {
  label: string;
  minPercent: number;
  gradePoint: number | null;
  isPassing: boolean;
}
