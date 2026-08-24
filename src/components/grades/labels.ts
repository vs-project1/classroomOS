import type { ExamType } from "@/db/schema";

/**
 * Human-readable labels for exam categories (mirrors exams.examType values).
 * Shared by the admin gradebook, student My Grades, and report card views.
 */
export const CATEGORY_LABELS: Record<ExamType, string> = {
  unit_test: "Unit Test",
  midterm: "Midterm",
  pre_board: "Pre-Board",
  practical: "Practical",
  final: "Final Exam",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as ExamType] ?? category;
}
