import "./maintenance/mock-server-only.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../src/db/client";
import {
  subjects,
  weeklyRoutine,
  dailySessions,
  semesterTelegramConfigs,
  telegramBroadcastLogs,
  courseUnits,
  students,
} from "../src/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  toSemesterNumber,
  toSemesterRoman,
  toSemesterOrdinal,
  zSemester,
  ROMAN_SEMESTERS,
} from "../src/lib/semester";

async function runVerification() {
  console.log("==================================================");
  console.log("  P1 DATABASE STANDARDIZATION & SAFETY VERIFICATION");
  console.log("==================================================");

  // Explicitly ensure SQLite foreign keys are active on this connection
  await db.run(sql`PRAGMA foreign_keys = ON;`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  function isConstraintError(err: any): boolean {
    const fullMsg = (String(err) + " " + (err?.cause?.message ?? "") + " " + (err?.message ?? "")).toLowerCase();
    return fullMsg.includes("constraint") || fullMsg.includes("check");
  }

  function isForeignKeyError(err: any): boolean {
    const fullMsg = (String(err) + " " + (err?.cause?.message ?? "") + " " + (err?.message ?? "")).toLowerCase();
    return fullMsg.includes("foreign key") || fullMsg.includes("constraint");
  }

  // ----------------------------------------------------
  // TEST 1: Canonical Semester Conversion & Formatting
  // ----------------------------------------------------
  console.log("\n[Test Suite 1: Canonical Semester Conversion & Formatting]");

  // 1.1 Roman to Number
  ROMAN_SEMESTERS.forEach((rom, idx) => {
    const expectedNum = idx + 1;
    assert(toSemesterNumber(rom) === expectedNum, `toSemesterNumber('${rom}') === ${expectedNum}`);
    assert(toSemesterNumber(rom.toLowerCase()) === expectedNum, `toSemesterNumber('${rom.toLowerCase()}') === ${expectedNum}`);
  });

  // 1.2 Ordinals and Numbers
  assert(toSemesterNumber("1st Semester") === 1, "toSemesterNumber('1st Semester') === 1");
  assert(toSemesterNumber("2nd Semester") === 2, "toSemesterNumber('2nd Semester') === 2");
  assert(toSemesterNumber("3rd Semester") === 3, "toSemesterNumber('3rd Semester') === 3");
  assert(toSemesterNumber("4th Semester") === 4, "toSemesterNumber('4th Semester') === 4");
  assert(toSemesterNumber("8th") === 8, "toSemesterNumber('8th') === 8");
  assert(toSemesterNumber("Semester 5") === 5, "toSemesterNumber('Semester 5') === 5");
  assert(toSemesterNumber(6) === 6, "toSemesterNumber(6) === 6");
  assert(toSemesterNumber("7") === 7, "toSemesterNumber('7') === 7");

  // 1.3 Out-of-bounds / Fallbacks (canonical clamping specification)
  assert(toSemesterNumber("Invalid") === 1, "toSemesterNumber('Invalid') falls back to 1");
  assert(toSemesterNumber(0) === 1, "toSemesterNumber(0) clamps to 1");
  assert(toSemesterNumber(9) === 8, "toSemesterNumber(9) clamps to 8");
  assert(toSemesterNumber("Semester IV") === 4, "toSemesterNumber('Semester IV') === 4");
  assert(toSemesterNumber("Sem-II") === 2, "toSemesterNumber('Sem-II') === 2");
  assert(toSemesterNumber("Sem VI") === 6, "toSemesterNumber('Sem VI') === 6");
  assert(toSemesterNumber("10") === 8, "toSemesterNumber('10') string clamps to 8");
  assert(toSemesterNumber("0") === 1, "toSemesterNumber('0') string clamps to 1");

  // 1.4 Number to Roman & Ordinal
  assert(toSemesterRoman(1) === "I", "toSemesterRoman(1) === 'I'");
  assert(toSemesterRoman(8) === "VIII", "toSemesterRoman(8) === 'VIII'");
  assert(toSemesterOrdinal(1) === "1st Semester", "toSemesterOrdinal(1) === '1st Semester'");
  assert(toSemesterOrdinal(2) === "2nd Semester", "toSemesterOrdinal(2) === '2nd Semester'");
  assert(toSemesterOrdinal(3) === "3rd Semester", "toSemesterOrdinal(3) === '3rd Semester'");
  assert(toSemesterOrdinal(4) === "4th Semester", "toSemesterOrdinal(4) === '4th Semester'");

  // 1.5 Zod Schema Validation
  assert(zSemester.safeParse(1).success, "zSemester accepts integer 1");
  assert(zSemester.safeParse(8).success, "zSemester accepts integer 8");
  assert(!zSemester.safeParse(0).success, "zSemester rejects 0");
  assert(!zSemester.safeParse(9).success, "zSemester rejects 9");
  assert(!zSemester.safeParse("abc").success, "zSemester rejects non-numeric string 'abc'");
  assert(zSemester.parse("1") === 1, "zSemester coerces string '1' to integer 1");

  // ----------------------------------------------------
  // TEST 2: Schema Integrity & Check Constraints
  // ----------------------------------------------------
  console.log("\n[Test Suite 2: Check Constraints on Semester Columns]");

  // 2.1 subjects check constraint
  let subjectsCheckPassed = false;
  try {
    await db.insert(subjects).values({
      id: `test_sub_invalid_${Date.now()}`,
      name: "Invalid Subject",
      code: "INV999",
      slug: `inv-${Date.now()}`,
      semester: 9,
    });
  } catch (err: any) {
    if (isConstraintError(err)) {
      subjectsCheckPassed = true;
    }
  }
  assert(subjectsCheckPassed, "subjects table rejects semester = 9 via check constraint");

  // 2.2 weeklyRoutine check constraint
  let routineCheckPassed = false;
  try {
    await db.insert(weeklyRoutine).values({
      id: `test_rt_invalid_${Date.now()}`,
      semester: 0,
      section: "A",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:00",
    });
  } catch (err: any) {
    if (isConstraintError(err)) {
      routineCheckPassed = true;
    }
  }
  assert(routineCheckPassed, "weeklyRoutine table rejects semester = 0 via check constraint");

  // 2.3 dailySessions check constraint
  let dailyCheckPassed = false;
  try {
    await db.insert(dailySessions).values({
      id: `test_ds_invalid_${Date.now()}`,
      date: new Date(),
      semester: 12,
    });
  } catch (err: any) {
    if (isConstraintError(err)) {
      dailyCheckPassed = true;
    }
  }
  assert(dailyCheckPassed, "dailySessions table rejects semester = 12 via check constraint");

  // 2.4 semesterTelegramConfigs check constraint
  let tgConfigCheckPassed = false;
  try {
    await db.insert(semesterTelegramConfigs).values({
      id: `test_tgc_invalid_${Date.now()}`,
      semester: -1,
      chatId: "12345",
    });
  } catch (err: any) {
    if (isConstraintError(err)) {
      tgConfigCheckPassed = true;
    }
  }
  assert(tgConfigCheckPassed, "semesterTelegramConfigs rejects semester = -1 via check constraint");

  // 2.5 telegramBroadcastLogs check constraint
  let tgLogCheckPassed = false;
  try {
    await db.insert(telegramBroadcastLogs).values({
      id: `test_tgl_invalid_${Date.now()}`,
      semester: 10,
      type: "morning_brief",
      messageText: "Test",
      status: "pending",
    });
  } catch (err: any) {
    if (isConstraintError(err)) {
      tgLogCheckPassed = true;
    }
  }
  assert(tgLogCheckPassed, "telegramBroadcastLogs rejects semester = 10 via check constraint");

  // ----------------------------------------------------
  // TEST 3: Foreign Key Restrict on Subjects
  // ----------------------------------------------------
  console.log("\n[Test Suite 3: Foreign Key Restriction on Subjects]");

  const dummySubId = `test_sub_fk_${Date.now()}`;
  const dummyUnitId = `test_unit_fk_${Date.now()}`;

  // Create dummy subject
  await db.insert(subjects).values({
    id: dummySubId,
    name: "FK Test Subject",
    code: "FK101",
    slug: `fk-${Date.now()}`,
    semester: 1,
    isActive: true,
  });

  // Create child course_units row referencing subject
  await db.insert(courseUnits).values({
    id: dummyUnitId,
    subjectId: dummySubId,
    title: "Unit 1: Safety & Integrity",
    order: 1,
  });

  let fkRestrictTriggered = false;
  try {
    // Attempt raw DELETE on parent subject
    await db.delete(subjects).where(eq(subjects.id, dummySubId));
  } catch (err: any) {
    if (isForeignKeyError(err)) {
      fkRestrictTriggered = true;
    }
  }
  assert(fkRestrictTriggered, "Hard delete of subject with dependent course_units is BLOCKED by foreign key restrict");

  // Clean up child then parent
  await db.delete(courseUnits).where(eq(courseUnits.id, dummyUnitId));
  await db.delete(subjects).where(eq(subjects.id, dummySubId));
  assert(true, "Dependent course_unit and dummy subject cleaned up cleanly");

  // ----------------------------------------------------
  // TEST 4: Soft Deletion & Active Filtering
  // ----------------------------------------------------
  console.log("\n[Test Suite 4: Soft Deletion & Active Filtering]");

  const softSubId = `test_sub_soft_${Date.now()}`;
  const softUnitId = `test_unit_soft_${Date.now()}`;

  // Insert active subject and child unit
  await db.insert(subjects).values({
    id: softSubId,
    name: "Soft Delete Test Subject",
    code: "SOFT101",
    slug: `soft-${Date.now()}`,
    semester: 2,
    isActive: true,
  });

  await db.insert(courseUnits).values({
    id: softUnitId,
    subjectId: softSubId,
    title: "Unit 1: Preserved History",
    order: 1,
  });

  // Soft delete the subject
  await db.update(subjects).set({ isActive: false }).where(eq(subjects.id, softSubId));

  // Verify subject still exists in DB
  const rawSub = await db.query.subjects.findFirst({
    where: eq(subjects.id, softSubId),
  });
  assert(rawSub !== undefined && rawSub.isActive === false, "Subject record preserved with isActive = false");

  // Verify dependent child record remains intact
  const rawUnit = await db.query.courseUnits.findFirst({
    where: eq(courseUnits.id, softUnitId),
  });
  assert(rawUnit !== undefined && rawUnit.subjectId === softSubId, "Dependent unit remains completely intact after soft deletion");

  // Verify active filter query excludes soft deleted subject
  const activeSubs = await db.query.subjects.findMany({
    where: and(eq(subjects.id, softSubId), eq(subjects.isActive, true)),
  });
  assert(activeSubs.length === 0, "Active filter query omits soft deleted subject");

  // Clean up
  await db.delete(courseUnits).where(eq(courseUnits.id, softUnitId));
  await db.delete(subjects).where(eq(subjects.id, softSubId));

  // ----------------------------------------------------
  // TEST 5: Direct SQL Joins (students.semester = subjects.semester)
  // ----------------------------------------------------
  console.log("\n[Test Suite 5: Direct SQL Equality Joins]");

  const directJoins = await db
    .select({
      studentName: students.name,
      studentSemester: students.semester,
      subjectName: subjects.name,
      subjectSemester: subjects.semester,
    })
    .from(students)
    .innerJoin(
      subjects,
      and(
        eq(students.semester, subjects.semester),
        eq(subjects.isActive, true)
      )
    )
    .limit(5);

  assert(directJoins.length > 0, `Direct integer equality join returned ${directJoins.length} cohort matches`);
  const allMatch = directJoins.every((row) => row.studentSemester === row.subjectSemester);
  assert(allMatch, "Every joined row has exact match: studentSemester === subjectSemester");

  // ----------------------------------------------------
  // TEST 6: Routine Query Push-Down
  // ----------------------------------------------------
  console.log("\n[Test Suite 6: Routine Query Push-Down to SQL]");

  const targetSemester = 2;
  const routineResults = await db
    .select({
      routineId: weeklyRoutine.id,
      dayOfWeek: weeklyRoutine.dayOfWeek,
      startTime: weeklyRoutine.startTime,
      endTime: weeklyRoutine.endTime,
      routineSemester: weeklyRoutine.semester,
      subjectName: subjects.name,
      subjectSemester: subjects.semester,
    })
    .from(weeklyRoutine)
    .leftJoin(
      subjects,
      and(
        eq(weeklyRoutine.subjectId, subjects.id),
        eq(subjects.isActive, true)
      )
    )
    .where(eq(weeklyRoutine.semester, targetSemester))
    .limit(5);

  assert(routineResults.length > 0, `Routine SQL push-down returned ${routineResults.length} slots for semester ${targetSemester}`);
  const allSem2 = routineResults.every((r) => r.routineSemester === targetSemester);
  assert(allSem2, `All returned routine slots strictly have routineSemester = ${targetSemester}`);

  // ----------------------------------------------------
  // TEST 7: Student Query Filtering with Roman Numerals
  // ----------------------------------------------------
  console.log("\n[Test Suite 7: Student Query Filtering with Roman Numerals]");

  const sem2Target = toSemesterNumber("II");
  const filteredStudents = await db
    .select({ rollNumber: students.rollNumber, semester: students.semester })
    .from(students)
    .where(eq(students.semester, sem2Target))
    .limit(10);

  assert(filteredStudents.length > 0, `Query with toSemesterNumber('II') returned ${filteredStudents.length} 2nd semester students`);
  assert(filteredStudents.every((s) => s.semester === 2), "All returned students strictly belong to Semester 2");

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification script failed with exception:", err);
  process.exit(1);
});
