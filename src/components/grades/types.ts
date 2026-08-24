/**
 * Serializable view-model types shared by gradebook surfaces.
 * All computation happens server-side (computeSubjectGrade); client
 * components receive plain data only.
 */

/** One exam row inside a student-subject drilldown / subject card. */
export interface ExamLineItem {
  examId: string;
  title: string;
  category: string;
  totalMarks: number;
  /** ISO date string */
  examDate: string;
  obtainedMarks: number | null;
  isAbsent: boolean;
  /** false when no exam_results row exists yet → renders as Pending */
  hasResult: boolean;
}
