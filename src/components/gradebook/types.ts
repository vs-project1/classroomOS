import type { CategoryBreakdown } from "@/lib/grading/compute";
import type { ExamLineItem } from "@/components/grades/types";

/**
 * One student × subject cell of the gradebook matrix.
 * Precomputed on the server; the grid is purely presentational.
 */
export interface GradeCell {
  finalPct: number | null;
  letter: string;
  gradedCount: number;
  absentCount: number;
  pendingCount: number;
  /** Drilldown rows for this student-subject (all exams of the subject). */
  exams: ExamLineItem[];
}

export interface StudentGradeRow {
  studentId: string;
  name: string;
  rollNumber: string;
  semester: string | null;
  /** Keyed by subjectId — present only for subjects the student is enrolled in. */
  cells: Record<string, GradeCell | undefined>;
}

export interface GradebookSubject {
  id: string;
  name: string;
  code: string;
}

export type { CategoryBreakdown };
