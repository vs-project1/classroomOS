import { EditExamResultDialog } from "./edit-exam-result-dialog";
"use client";

import { useState } from "react";
import type { GradebookSubject, GradeCell, StudentGradeRow } from "./types";
import { categoryLabel } from "@/components/grades/labels";
import { formatNepaliDate } from "@/lib/nepali-date";

/**
 * Students × subjects grade matrix. Cells are precomputed server-side;
 * this component only handles selection state and the drilldown panel.
 */
export function GradeGrid({
  subjects,
  rows,
}: {
  subjects: GradebookSubject[];
  rows: StudentGradeRow[];
}) {
  const [selected, setSelected] = useState<{
    studentId: string;
    subjectId: string;
  } | null>(null);

  const selectedRow = selected
    ? rows.find((r) => r.studentId === selected.studentId)
    : undefined;
  const selectedSubject = selected
    ? subjects.find((s) => s.id === selected.subjectId)
    : undefined;
  const selectedCell =
    selected && selectedRow ? selectedRow.cells[selected.subjectId] : undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
          <h3 className="font-semibold text-xs tracking-widest uppercase text-muted-foreground font-fira-code">
            Grade Matrix
          </h3>
          <span className="text-xs text-muted-foreground">
            % = weighted final · <span className="font-bold">AB</span> absent ·{" "}
            <span className="font-bold">Pending</span> unmarked
          </span>
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 bg-card border-b border-r border-border/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground font-fira-sans min-w-44"
                >
                  Student
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject.id}
                    scope="col"
                    className="sticky top-0 z-20 bg-muted/10 backdrop-blur-sm border-b border-border/50 px-3 py-3 text-left align-bottom min-w-32"
                  >
                    <span className="block text-xs font-bold uppercase tracking-wider font-fira-code text-primary">
                      {subject.code}
                    </span>
                    <span className="block text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {subject.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} className="group">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card group-hover:bg-muted/30 border-b border-r border-border/40 px-4 py-2.5 text-left transition-colors"
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {row.name}
                    </span>
                    <span className="block text-xs text-muted-foreground font-fira-code">
                      {row.rollNumber}
                      {row.semester ? ` · Sem ${row.semester}` : ""}
                    </span>
                  </th>
                  {subjects.map((subject) => (
                    <td
                      key={subject.id}
                      className="border-b border-border/40 p-1"
                    >
                      {row.cells[subject.id] ? (
                        <GradeCellButton
                          cell={row.cells[subject.id]!}
                          studentName={row.name}
                          subject={subject}
                          isSelected={
                            selected?.studentId === row.studentId &&
                            selected?.subjectId === subject.id
                          }
                          onSelect={() =>
                            setSelected((prev) =>
                              prev?.studentId === row.studentId &&
                              prev?.subjectId === subject.id
                                ? null
                                : { studentId: row.studentId, subjectId: subject.id }
                            )
                          }
                        />
                      ) : (
                        <span className="sr-only">
                          {row.name} is not enrolled in {subject.name}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && selectedRow && selectedSubject && selectedCell && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/10 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {selectedRow.name}{" "}
                <span className="text-muted-foreground font-normal">
                  — {selectedSubject.name} ({selectedSubject.code})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Final:{" "}
                {selectedCell.finalPct !== null
                  ? `${selectedCell.finalPct.toFixed(1)}% (${selectedCell.letter})`
                  : "Nothing graded yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close exam drilldown"
              className="text-xs font-medium px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/5 text-xs font-bold uppercase tracking-wider text-muted-foreground font-fira-sans">
              <tr>
                <th scope="col" className="px-6 py-3">Exam</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-6 py-3 text-right">Result</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedCell.exams.map((exam) => (
                <tr key={exam.examId} className="border-t border-border/30">
                  <td className="px-6 py-3 font-medium">{exam.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {categoryLabel(exam.category)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-fira-code">
                    {exam.examDate ? <DateText iso={exam.examDate} /> : "-"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {!exam.hasResult || (exam.obtainedMarks === null && !exam.isAbsent) ? (
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md border border-border">
                        Pending
                      </span>
                    ) : exam.isAbsent ? (
                      <span className="text-xs uppercase tracking-wider font-bold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-md border border-destructive/20">
                        AB
                      </span>
                    ) : (
                      <span className="font-fira-code">
                        {exam.obtainedMarks}
                        <span className="text-muted-foreground">
                          /{exam.totalMarks}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GradeCellButton({
  cell,
  studentName,
  subject,
  isSelected,
  onSelect,
}: {
  cell: GradeCell;
  studentName: string;
  subject: GradebookSubject;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const summary =
    cell.finalPct !== null
      ? `${Math.round(cell.finalPct)} percent, grade ${cell.letter}`
      : "not graded yet";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${studentName}, ${subject.name}: ${summary}. Show exam details.`}
      aria-pressed={isSelected}
      className={`w-full h-full min-h-14 px-2 py-1.5 rounded-md flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? "bg-primary/10 ring-2 ring-ring"
          : "hover:bg-muted/50 cursor-pointer"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span className="font-fira-code font-semibold text-sm tabular-nums">
          {cell.finalPct !== null ? `${Math.round(cell.finalPct)}%` : "—"}
        </span>
        {cell.letter !== "—" && (
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              cell.letter === "F"
                ? "text-destructive bg-destructive/10"
                : "text-primary bg-primary/10"
            }`}
          >
            {cell.letter}
          </span>
        )}
      </span>
      {(cell.absentCount > 0 || cell.pendingCount > 0) && (
        <span className="flex items-center gap-1">
          {cell.absentCount > 0 && (
            <span
              className="text-[9px] font-bold uppercase tracking-wide text-destructive bg-destructive/10 px-1 py-px rounded border border-destructive/20"
              title={`${cell.absentCount} exam(s) marked absent`}
            >
              AB{cell.absentCount > 1 ? `×${cell.absentCount}` : ""}
            </span>
          )}
          {cell.pendingCount > 0 && (
            <span
              className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground bg-muted px-1 py-px rounded border border-border"
              title={`${cell.pendingCount} exam(s) awaiting marks`}
            >
              Pending{cell.pendingCount > 1 ? `×${cell.pendingCount}` : ""}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

/** Date formatting lives in a tiny leaf so it only renders client-side after selection. */
function DateText({ iso }: { iso: string }) {
  return (
    <>
      {formatNepaliDate(iso)}
    </>
  );
}
