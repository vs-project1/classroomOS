# Consecutive Session Merging & Routine-Driven Timings Design Spec

## Overview
Class schedules in TU BCA frequently schedule double periods (two consecutive 50-minute slots for the same subject, e.g., Period 1 & 2 for Discrete Structure or OOP Lab). When logging a lecture, teachers conduct and record this as a single unified session. Furthermore, manual time entry is redundant and error-prone since the weekly routine already specifies exact start and end times.

This enhancement:
1. Automatically groups and merges consecutive routine slots of the same subject on the same day into a single selectable session card with a combined time window (e.g. `06:25` to `08:05`).
2. Eliminates manual start/end time text inputs in favor of automatic, routine-driven timings with a read-only duration badge.
3. Submits exact routine timings cleanly via hidden inputs.

---

## Block Merging Algorithm
Given routine slots for a day sorted ascending by `startTime`:
```ts
export interface MergedClassBlock {
  blockId: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    code: string;
    semester?: string | null;
  };
  startTime: string;
  endTime: string;
  room: string | null;
  periodCount: number;
  routineId: string;
}
```
Algorithm:
```ts
const mergedBlocks: MergedClassBlock[] = [];
for (const slot of sortedDaySlots) {
  const lastBlock = mergedBlocks[mergedBlocks.length - 1];
  if (
    lastBlock &&
    lastBlock.subjectId === slot.subjectId &&
    lastBlock.endTime === slot.startTime
  ) {
    lastBlock.endTime = slot.endTime;
    lastBlock.periodCount += 1;
    if (!lastBlock.room && slot.room) lastBlock.room = slot.room;
  } else {
    mergedBlocks.push({
      blockId: slot.id,
      subjectId: slot.subjectId,
      subject: slot.subject,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      periodCount: 1,
      routineId: slot.id,
    });
  }
}
```

---

## UI/UX Refinement
- **Class Card Presentation:**
  - Displays: Subject Title (`Discrete Structure`) & Code (`BCA 151`).
  - Period Pill: `Double Period (2 Periods)` or `Single Period (1 Period)`.
  - Time Range: `06:25 AM – 08:05 AM`.
  - Room / Lab.
- **Timing Summary:**
  - When a block is selected, displays a locked duration badge instead of editable time inputs.
  - Hidden inputs `name="startTime"` and `name="endTime"` transmit values to the server action.

---

## Server Action Compatibility
- `createSession` in `src/features/sessions/actions/session-actions.ts` already expects:
  `startTime`, `endTime`, `subjectId`, `sessionDate`, `routineId`.
- The teacher schedule verification:
  Checks that `weeklyRoutine` has a slot for `(subjectId, sessionDay)` taught by the teacher. Since the merged block originated from valid routine slots, this continues to validate cleanly!
