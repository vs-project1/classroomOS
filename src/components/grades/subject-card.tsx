"use client";

import type { CategoryBreakdown } from "@/lib/grading/compute";
import type { ExamLineItem } from "@/components/grades/types";
import { categoryLabel } from "@/components/grades/labels";

export type SubjectCardExam = ExamLineItem;

/**
 * Read-only per-subject grade summary: weighted final + letter,
 * per-category contribution bars, and the underlying exam list.
 */
export function SubjectCard({
  subjectName,
  subjectCode,
  finalPct,
  letter,
  categories,
  exams,
}: {
  subjectName: string;
  subjectCode: string;
  finalPct: number | null;
  letter: string;
  categories: CategoryBreakdown[];
  exams: SubjectCardExam[];
}) {
  return (
    <article className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
      <header className="px-5 py-4 border-b border-border/50 bg-muted/10 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{subjectName}</h3>
          <p className="text-xs uppercase tracking-wider font-fira-code text-primary mt-0.5">{subjectCode}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-fira-code font-bold text-xl tabular-nums leading-none">
            {finalPct !== null ? `${Math.round(finalPct)}%` : "—"}
          </p>
          {letter !== "—" && (
            <span
              className={`inline-block mt-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                letter === "F"
                  ? "text-destructive bg-destructive/10 border-destructive/20"
                  : "text-primary bg-primary/10 border-primary/20"
              }`}
            >
              Grade {letter}
            </span>
          )}
        </div>
      </header>

      <section aria-label={`${subjectName} category breakdown`} className="px-5 py-4 space-y-2.5">
        {categories.map((category) => (
          <CategoryBar key={category.category} category={category} />
        ))}
      </section>

      <section aria-label={`${subjectName} exam results`} className="border-t border-border/40">
        <ul className="divide-y divide-border/30">
          {exams.map((exam) => (
            <li
              key={exam.examId}
              className="px-5 py-2.5 flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{exam.title}</p>
                <p className="text-xs text-muted-foreground">{categoryLabel(exam.category)}</p>
              </div>
              {!exam.hasResult || (exam.obtainedMarks === null && !exam.isAbsent) ? (
                <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                  Pending
                </span>
              ) : exam.isAbsent ? (
                <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                  AB
                </span>
              ) : (
                <span className="shrink-0 font-fira-code tabular-nums text-sm">
                  {exam.obtainedMarks}
                  <span className="text-muted-foreground">/{exam.totalMarks}</span>
                </span>
              )}
            </li>
          ))}
          {exams.length === 0 && (
            <li className="px-5 py-3 text-xs text-muted-foreground italic">
              No exams scheduled yet.
            </li>
          )}
        </ul>
      </section>
    </article>
  );
}

function CategoryBar({ category }: { category: CategoryBreakdown }) {
  const fillPct = category.pct !== null ? Math.min(100, Math.max(0, category.pct)) : 0;

  return (
    <div className="space-y-1" title={`Weight ${category.weightPct}%`}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">
          {categoryLabel(category.category)}
          <span className="ml-1.5 text-muted-foreground font-normal">
            ({category.weightPct}% weight)
          </span>
        </span>
        {category.pct !== null ? (
          <span className="font-fira-code tabular-nums text-muted-foreground">
            {Math.round(category.pct)}%
          </span>
        ) : (
          <span className="uppercase tracking-wide text-[10px] font-bold text-muted-foreground">
            {category.status === "absent"
              ? `AB ×${category.absentCount}`
              : `${category.pendingCount} pending`}
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="img"
        aria-label={`${categoryLabel(category.category)}: ${
          category.pct !== null ? `${Math.round(category.pct)} percent` : "no graded exams"
        }, weight ${category.weightPct} percent`}
      >
        <div
          className={`h-full rounded-full transition-all ${
            category.pct === null ? "w-0" : fillPct >= 60 ? "bg-primary" : "bg-destructive"
          }`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  );
}
