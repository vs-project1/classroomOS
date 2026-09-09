import { computePeriodColumns, buildDayMatrixRows } from "../src/components/timetable/matrix-utils";
import type { RoutineSlotData } from "../src/components/timetable/routine-card";

// Test BCA Semester 2 fixture:
// 2 back-to-back Discrete Structure slots: 06:25–07:15 & 07:15–08:05
// P3 & P4: 08:05–08:55 & 08:55–09:45 (OOP Lab)
// Break: 09:45–10:10 (25 min gap)
// P5: 10:10–11:00 (Microprocessor)
// P6: 11:00–11:50 (Presentation)

const mockSlots: RoutineSlotData[] = [
  {
    id: "slot_1",
    subjectName: "Discrete Structure",
    subjectCode: "BCA 151",
    startTime: "06:25",
    endTime: "07:15",
    room: "Room 201",
    teacherName: "Er. Nikunja Sir",
    status: "completed",
  },
  {
    id: "slot_2",
    subjectName: "Discrete Structure",
    subjectCode: "BCA 151",
    startTime: "07:15",
    endTime: "08:05",
    room: "Room 201",
    teacherName: "Er. Nikunja Sir",
    status: "completed",
  },
  {
    id: "slot_3",
    subjectName: "OOP in Java",
    subjectCode: "BCA 153",
    startTime: "08:05",
    endTime: "08:55",
    room: "Lab 1",
    teacherName: "Er. Ashish Sir",
    status: "completed",
  },
  {
    id: "slot_4",
    subjectName: "OOP in Java",
    subjectCode: "BCA 153",
    startTime: "08:55",
    endTime: "09:45",
    room: "Lab 1",
    teacherName: "Er. Ashish Sir",
    status: "completed",
  },
  {
    id: "slot_5",
    subjectName: "Microprocessor",
    subjectCode: "BCA 152",
    startTime: "10:10",
    endTime: "11:00",
    room: "Room 201",
    teacherName: "Er. Saddam Sir",
    status: "upcoming",
  },
  {
    id: "slot_6",
    subjectName: "Presentation",
    subjectCode: "BCA 156",
    startTime: "11:00",
    endTime: "11:50",
    room: "Seminar Hall",
    teacherName: "Prof. Rajesh Shrestha",
    status: "upcoming",
  },
];

console.log("🧪 Running Timetable Matrix Utils Tests...");

// 1. Period Columns Computation
const columns = computePeriodColumns(mockSlots);
console.log(`Found ${columns.length} columns:`);
columns.forEach((c) => console.log(`  - [${c.id}] ${c.label}: ${c.startTime} - ${c.endTime} (${c.durationMins}m, break=${Boolean(c.isBreak)})`));

if (columns.length !== 7) {
  throw new Error(`Expected 7 columns (6 periods + 1 break), got ${columns.length}`);
}

const breakCol = columns.find((c) => c.isBreak);
if (!breakCol || breakCol.startTime !== "09:45" || breakCol.endTime !== "10:10" || breakCol.durationMins !== 25) {
  throw new Error(`Break column mismatch: ${JSON.stringify(breakCol)}`);
}
console.log("✅ Break column correctly detected between 09:45 and 10:10 (25 min)");

// 2. Day Matrix Rows & Adjacent Merging
const dayGroups = [
  {
    dayName: "Monday",
    dayIndex: 1,
    isToday: false,
    slots: mockSlots,
  },
];

const matrixRows = buildDayMatrixRows(dayGroups, columns);
const mondayRow = matrixRows[0];
console.log(`Monday row produced ${mondayRow.cells.length} cells:`);
mondayRow.cells.forEach((cell, idx) => {
  if (cell.type === "class") {
    console.log(`  Cell ${idx}: [CLASS] ${cell.cellData?.subjectName} (${cell.cellData?.startTime} - ${cell.cellData?.endTime}), colSpan=${cell.colSpan}, isDouble=${cell.cellData?.isDoublePeriod}`);
  } else if (cell.type === "break") {
    console.log(`  Cell ${idx}: [BREAK] ☕ (${cell.breakData?.durationMins}m)`);
  } else {
    console.log(`  Cell ${idx}: [EMPTY]`);
  }
});

// Checks:
// Cell 0 should be merged Discrete Structure with colSpan 2
const cell0 = mondayRow.cells[0];
if (cell0.type !== "class" || cell0.colSpan !== 2 || !cell0.cellData?.isDoublePeriod || cell0.cellData.endTime !== "08:05") {
  throw new Error(`Cell 0 was not properly merged: ${JSON.stringify(cell0)}`);
}
console.log("✅ Discrete Structure Periods 1 & 2 merged with colSpan=2 (06:25 - 08:05)");

// Cell 1 should be merged OOP Lab with colSpan 2
const cell1 = mondayRow.cells[1];
if (cell1.type !== "class" || cell1.colSpan !== 2 || !cell1.cellData?.isDoublePeriod || cell1.cellData.endTime !== "09:45") {
  throw new Error(`Cell 1 was not properly merged: ${JSON.stringify(cell1)}`);
}
console.log("✅ OOP in Java Periods 3 & 4 merged with colSpan=2 (08:05 - 09:45)");

// Cell 2 should be Break
const cell2 = mondayRow.cells[2];
if (cell2.type !== "break") {
  throw new Error(`Cell 2 was not break: ${JSON.stringify(cell2)}`);
}
console.log("✅ Recess break cell correctly placed at index 2");

console.log("🎉 All matrix-utils tests passed!");
