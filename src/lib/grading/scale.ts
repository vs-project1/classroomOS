import { z } from "zod";

/**
 * Grade scale — TS constant by design (plan Resolved Decision):
 * promote to a table only when admins actually ask.
 * A ≥90, B ≥80, C ≥70, D ≥60, F <60.
 */
export const GRADE_SCALE = [
  { min: 90, letter: "A" },
  { min: 80, letter: "B" },
  { min: 70, letter: "C" },
  { min: 60, letter: "D" },
  { min: 0, letter: "F" },
] as const;

/**
 * Map an exact percentage (0-100) to its letter grade.
 * Caller decides rounding policy; this uses the exact ratio passed in.
 */
export function letterForPct(pct: number): string {
  const band = GRADE_SCALE.find((band) => pct >= band.min);
  return band ? band.letter : "F";
}

// --- Exam categories (mirror exams.examType CHECK constraint) ---

export const EXAM_CATEGORY_VALUES = [
  "unit_test",
  "midterm",
  "pre_board",
  "practical",
  "final",
] as const;

export const examCategorySchema = z.enum(EXAM_CATEGORY_VALUES);
export type ExamCategory = z.infer<typeof examCategorySchema>;

// --- Weight upsert schema ---
// Per-subject category weights must sum to exactly 100 and contain no duplicates.

export const weightEntrySchema = z.object({
  category: examCategorySchema,
  weightPct: z
    .number()
    .int("Weight must be a whole number")
    .min(0, "Weight must be at least 0")
    .max(100, "Weight must be at most 100"),
});

export const weightUpsertSchema = z
  .object({
    weights: z
      .array(weightEntrySchema)
      .min(1, "At least one weight is required")
      .max(EXAM_CATEGORY_VALUES.length),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<ExamCategory>();
    for (const entry of data.weights) {
      if (seen.has(entry.category)) {
        ctx.addIssue({
          code: "custom",
          path: ["weights"],
          message: `Duplicate category: ${entry.category}`,
        });
      }
      seen.add(entry.category);
    }
    const total = data.weights.reduce((sum, w) => sum + w.weightPct, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: "custom",
        path: ["weights"],
        message: `Weights must sum to 100 (got ${total})`,
      });
    }
  });

export type WeightUpsertInput = z.infer<typeof weightUpsertSchema>;

// --- Exam result save schema ---
// absent XOR marks non-null: an absent student cannot carry marks, and a
// scored result must carry marks (pending is expressed by marks=null).

export const examResultSaveSchema = z
  .object({
    isAbsent: z.boolean(),
    obtainedMarks: z
      .number()
      .int("Marks must be a whole number")
      .min(0, "Marks cannot be negative")
      .nullable(),
    remarks: z.string().trim().max(500, "Remarks too long").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isAbsent && data.obtainedMarks !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["obtainedMarks"],
        message: "An absent student cannot have marks recorded.",
      });
    }
    if (!data.isAbsent && data.obtainedMarks === null) {
      ctx.addIssue({
        code: "custom",
        path: ["obtainedMarks"],
        message:
          "Marks are required unless the student is marked absent.",
      });
    }
  });

export type ExamResultSaveInput = z.infer<typeof examResultSaveSchema>;
