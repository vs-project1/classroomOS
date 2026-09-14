import type { RoutineSlotData } from "./routine-card";

export type PeriodColumn = {
  id: string;
  label: string;
  periodNumber?: number;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  isBreak?: boolean;
  durationMins: number;
};

export type TimetableCell = {
  id: string;
  subjectName: string;
  subjectCode?: string | null;
  startTime: string;
  endTime: string;
  room?: string | null;
  teacherName?: string | null;
  notes?: string | null;
  status?: "upcoming" | "ongoing" | "completed";
  isLab?: boolean;
  colSpan: number;
  isDoublePeriod?: boolean;
  originalSlots: RoutineSlotData[];
  semester?: string | null;
};

export type DayRowMatrix = {
  dayName: string;
  dayIndex: number;
  isToday: boolean;
  cells: Array<{
    type: "class" | "break" | "empty";
    colSpan: number;
    cellData?: TimetableCell;
    breakData?: { startTime: string; endTime: string; durationMins: number };
  }>;
};

export function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Computes sorted unique period columns from all routine slots,
 * automatically detecting break intervals (gaps >= 15 mins).
 */
export function computePeriodColumns(allSlots: RoutineSlotData[]): PeriodColumn[] {
  if (!allSlots || allSlots.length === 0) return [];

  // Collect distinct time intervals
  const intervalMap = new Map<string, { startTime: string; endTime: string }>();
  for (const s of allSlots) {
    const key = `${s.startTime}-${s.endTime}`;
    if (!intervalMap.has(key)) {
      intervalMap.set(key, { startTime: s.startTime, endTime: s.endTime });
    }
  }

  const sortedIntervals = Array.from(intervalMap.values()).sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime)
  );

  const columns: PeriodColumn[] = [];
  let periodCounter = 1;

  for (let i = 0; i < sortedIntervals.length; i++) {
    const curr = sortedIntervals[i];
    const currStartM = parseMinutes(curr.startTime);
    const currEndM = parseMinutes(curr.endTime);

    // Check if there was a gap between previous interval end and current start >= 15m
    if (i > 0) {
      const prev = sortedIntervals[i - 1];
      const prevEndM = parseMinutes(prev.endTime);
      const gapMins = currStartM - prevEndM;

      if (gapMins >= 15) {
        columns.push({
          id: `break_${prev.endTime}_${curr.startTime}`,
          label: "BREAK",
          startTime: prev.endTime,
          endTime: curr.startTime,
          isBreak: true,
          durationMins: gapMins,
        });
      }
    }

    columns.push({
      id: `period_${periodCounter}`,
      label: `Period ${periodCounter}`,
      periodNumber: periodCounter,
      startTime: curr.startTime,
      endTime: curr.endTime,
      durationMins: Math.max(0, currEndM - currStartM),
    });
    periodCounter++;
  }

  return columns;
}

/**
 * Builds the timetable matrix rows for each day.
 * Merges adjacent periods for the same subject, teacher, and room.
 */
export function buildDayMatrixRows(
  dayGroups: { dayName: string; dayIndex: number; isToday?: boolean; slots: RoutineSlotData[] }[],
  periodColumns: PeriodColumn[]
): DayRowMatrix[] {
  return dayGroups.map((group) => {
    const sortedSlots = [...group.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const cells: DayRowMatrix["cells"] = [];

    let colIdx = 0;
    while (colIdx < periodColumns.length) {
      const col = periodColumns[colIdx];

      // If this column is a Break
      if (col.isBreak) {
        cells.push({
          type: "break",
          colSpan: 1,
          breakData: {
            startTime: col.startTime,
            endTime: col.endTime,
            durationMins: col.durationMins,
          },
        });
        colIdx++;
        continue;
      }

      // Find slot starting at or covering this period column's start time
      const matchingSlot = sortedSlots.find(
        (s) => s.startTime === col.startTime
      );

      if (!matchingSlot) {
        cells.push({
          type: "empty",
          colSpan: 1,
        });
        colIdx++;
        continue;
      }

      // Check for consecutive adjacent slots that should merge
      let span = 1;
      let mergedEndTime = matchingSlot.endTime;
      const originalSlots = [matchingSlot];
      let currentCheckSlot = matchingSlot;

      while (colIdx + span < periodColumns.length) {
        const nextCol = periodColumns[colIdx + span];
        if (nextCol.isBreak) break;

        const nextSlot = sortedSlots.find((s) => s.startTime === currentCheckSlot.endTime);
        if (
          nextSlot &&
          nextSlot.subjectName === currentCheckSlot.subjectName &&
          nextSlot.room === currentCheckSlot.room &&
          (nextSlot.teacherName ?? "") === (currentCheckSlot.teacherName ?? "")
        ) {
          span++;
          mergedEndTime = nextSlot.endTime;
          originalSlots.push(nextSlot);
          currentCheckSlot = nextSlot;
        } else {
          break;
        }
      }

      const isLab =
        matchingSlot.isLab ||
        matchingSlot.subjectName.toLowerCase().includes("lab") ||
        matchingSlot.subjectName.toLowerCase().includes("practical") ||
        (matchingSlot.room ?? "").toLowerCase().includes("lab");

      cells.push({
        type: "class",
        colSpan: span,
        cellData: {
          id: matchingSlot.id,
          subjectName: matchingSlot.subjectName,
          subjectCode: matchingSlot.subjectCode,
          startTime: matchingSlot.startTime,
          endTime: mergedEndTime,
          room: matchingSlot.room,
          teacherName: matchingSlot.teacherName,
          notes: matchingSlot.notes,
          status: matchingSlot.status,
          isLab,
          colSpan: span,
          isDoublePeriod: span > 1,
          originalSlots,
          semester: matchingSlot.semester,
        },
      });

      colIdx += span;
    }

    return {
      dayName: group.dayName,
      dayIndex: group.dayIndex,
      isToday: Boolean(group.isToday),
      cells,
    };
  });
}
