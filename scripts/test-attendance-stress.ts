/**
 * Empirical Stress Test Harness for TU 80% Attendance Domain Math
 * Location: scripts/test-attendance-stress.ts
 */

import { calculateAttendanceMetrics, projectAttendance } from "../src/lib/attendance";

interface TestReport {
  totalPairsTested: number;
  missableBufferTests: { passed: number; failed: number; failures: any[] };
  recoveryTargetTests: { passed: number; failed: number; failures: any[] };
  categoryClassificationTests: { passed: number; failed: number; failures: any[] };
  whatIfSimulationTests: { passed: number; failed: number; failures: any[] };
  boundaryEdgeCaseTests: { passed: number; failed: number; failures: any[] };
  floatingPointPrecisionTests: { passed: number; failed: number; failures: any[] };
}

const report: TestReport = {
  totalPairsTested: 0,
  missableBufferTests: { passed: 0, failed: 0, failures: [] },
  recoveryTargetTests: { passed: 0, failed: 0, failures: [] },
  categoryClassificationTests: { passed: 0, failed: 0, failures: [] },
  whatIfSimulationTests: { passed: 0, failed: 0, failures: [] },
  boundaryEdgeCaseTests: { passed: 0, failed: 0, failures: [] },
  floatingPointPrecisionTests: { passed: 0, failed: 0, failures: [] },
};

console.log("================================================================================");
console.log("STARTING EMPIRICAL ADVERSARIAL STRESS-TEST FOR TU 80% ATTENDANCE DOMAIN ENGINE");
console.log("================================================================================\n");

// 1. BOUNDARY & SANITIZATION EDGE CASES
console.log("--- 1. Boundary & Sanitization Edge Cases ---");
const boundaryCases = [
  { name: "Zero sessions (0/0)", attended: 0, total: 0, expectedPct: 100, expectedCat: "SAFE", expMiss: 0, expRec: 0 },
  { name: "Negative attended (-5/10)", attended: -5, total: 10, expectedPct: 0, expectedCat: "DANGER", expMiss: 0, expRec: 40 },
  { name: "Negative total (5/-10)", attended: 5, total: -10, expectedPct: 100, expectedCat: "SAFE", expMiss: 1, expRec: 0 }, // safeTotal becomes max(5, 0)=5
  { name: "Attended > Total (15/10)", attended: 15, total: 10, expectedPct: 100, expectedCat: "SAFE", expMiss: 3, expRec: 0 }, // safeTotal clamped to 15 -> 15*1.25 - 15 = 3.75 -> floor=3
  { name: "100% Attendance (50/50)", attended: 50, total: 50, expectedPct: 100, expectedCat: "SAFE", expMiss: 12, expRec: 0 }, // 50*1.25 - 50 = 12.5 -> floor=12
  { name: "Exactly 80% Attendance (40/50)", attended: 40, total: 50, expectedPct: 80, expectedCat: "SAFE", expMiss: 0, expRec: 0 }, // 40*1.25 - 50 = 0
  { name: "79.9% Attendance (799/1000)", attended: 799, total: 1000, expectedPct: 80, expectedCat: "SAFE", expMiss: 0, expRec: 0 }, // rounded 79.9 -> 80%
  { name: "75.0% Attendance (75/100)", attended: 75, total: 100, expectedPct: 75, expectedCat: "CAUTION", expMiss: 0, expRec: 25 }, // 400 - 375 = 25
  { name: "74.0% Attendance (74/100)", attended: 74, total: 100, expectedPct: 74, expectedCat: "DANGER", expMiss: 0, expRec: 30 }, // 400 - 370 = 30
  { name: "0% Attendance (0/50)", attended: 0, total: 50, expectedPct: 0, expectedCat: "DANGER", expMiss: 0, expRec: 200 }, // 4*50 - 0 = 200
];

for (const tc of boundaryCases) {
  const res = calculateAttendanceMetrics(tc.attended, tc.total);
  const passed =
    res.percentage === tc.expectedPct &&
    res.category === tc.expectedCat &&
    res.missableSessions === tc.expMiss &&
    res.classesNeededToRecover === tc.expRec;

  if (passed) {
    report.boundaryEdgeCaseTests.passed++;
    console.log(`  ✓ [PASS] ${tc.name}: Pct=${res.percentage}%, Cat=${res.category}, Miss=${res.missableSessions}, Rec=${res.classesNeededToRecover}`);
  } else {
    report.boundaryEdgeCaseTests.failed++;
    const err = {
      name: tc.name,
      expected: { pct: tc.expectedPct, cat: tc.expectedCat, miss: tc.expMiss, rec: tc.expRec },
      actual: { pct: res.percentage, cat: res.category, miss: res.missableSessions, rec: res.classesNeededToRecover },
    };
    report.boundaryEdgeCaseTests.failures.push(err);
    console.error(`  ✗ [FAIL] ${tc.name}:`, err);
  }
}

// 2. EXHAUSTIVE GRID INVARIANT TESTING (A in 0..500, T in 1..500, A <= T)
console.log("\n--- 2. Exhaustive Grid Invariant Testing (500x500 pairs) ---");

const MAX_SESSIONS = 500;
let pairCount = 0;

for (let T = 1; T <= MAX_SESSIONS; T++) {
  for (let A = 0; A <= T; A++) {
    pairCount++;
    const res = calculateAttendanceMetrics(A, T);
    const exactRatio = A / T;
    const exactPct = exactRatio * 100;
    const roundedPct = Math.round(exactPct);

    // Test A: Percentage & Category
    let expectedCategory = "SAFE";
    if (roundedPct < 75) {
      expectedCategory = "DANGER";
    } else if (roundedPct < 80) {
      expectedCategory = "CAUTION";
    }

    if (res.percentage !== roundedPct || res.category !== expectedCategory) {
      report.categoryClassificationTests.failed++;
      report.categoryClassificationTests.failures.push({ A, T, res, roundedPct, expectedCategory });
    } else {
      report.categoryClassificationTests.passed++;
    }

    // Test B: Missable Buffer Invariant
    if (roundedPct >= 80) {
      const m = res.missableSessions;
      // Invariant 1: Missing m classes must preserve ratio or rounded percentage >= 80%
      // Exact TU rule: A / (T + m) >= 0.8
      // If m is theoretical floor(1.25A - T), let's check:
      const theoreticalM = Math.max(0, Math.floor(1.25 * A - T));
      if (m !== theoreticalM) {
        report.missableBufferTests.failed++;
        report.missableBufferTests.failures.push({
          A,
          T,
          m,
          theoreticalM,
          reason: "m does not match theoretical floor(1.25A - T)",
        });
      } else {
        // Verify that missing m sessions preserves >= 80% (or ratio >= 0.8)
        const ratioAfterM = A / (T + m);
        // And missing m + 1 sessions drops below 0.8
        const ratioAfterMPlus1 = A / (T + m + 1);

        const satisfiesPreserve = ratioAfterM >= 0.8 || Math.abs(ratioAfterM - 0.8) < 1e-9;
        const satisfiesDrop = ratioAfterMPlus1 < 0.8;

        if (!satisfiesPreserve && m > 0) {
          report.missableBufferTests.failed++;
          report.missableBufferTests.failures.push({ A, T, m, ratioAfterM, reason: "Missing m dropped below 80%" });
        } else if (!satisfiesDrop) {
          report.missableBufferTests.failed++;
          report.missableBufferTests.failures.push({ A, T, m, ratioAfterMPlus1, reason: "Missing m+1 did not drop below 80%" });
        } else {
          report.missableBufferTests.passed++;
        }
      }
    } else {
      // If roundedPct < 80, missableSessions must be 0
      if (res.missableSessions !== 0) {
        report.missableBufferTests.failed++;
        report.missableBufferTests.failures.push({ A, T, m: res.missableSessions, reason: "Missable sessions > 0 when < 80%" });
      } else {
        report.missableBufferTests.passed++;
      }
    }

    // Test C: Recovery Target Invariant
    if (roundedPct < 80) {
      const r = res.classesNeededToRecover;
      const theoreticalR = Math.max(0, 4 * T - 5 * A);
      if (r !== theoreticalR) {
        report.recoveryTargetTests.failed++;
        report.recoveryTargetTests.failures.push({
          A,
          T,
          r,
          theoreticalR,
          reason: "r does not match theoretical 4T - 5A",
        });
      } else {
        // Attending r sessions must restore attendance to >= 80%
        const ratioAfterR = (A + r) / (T + r);
        const satisfiesRestore = ratioAfterR >= 0.8 || Math.abs(ratioAfterR - 0.8) < 1e-9;

        // Attending r - 1 sessions must be strictly < 80%
        let satisfiesUnder = true;
        if (r > 0) {
          const ratioAfterRMinus1 = (A + r - 1) / (T + r - 1);
          satisfiesUnder = ratioAfterRMinus1 < 0.8;
        }

        if (!satisfiesRestore) {
          report.recoveryTargetTests.failed++;
          report.recoveryTargetTests.failures.push({ A, T, r, ratioAfterR, reason: "Attending r did not reach 80%" });
        } else if (!satisfiesUnder) {
          report.recoveryTargetTests.failed++;
          report.recoveryTargetTests.failures.push({ A, T, r, reason: "Attending r-1 was already >= 80%" });
        } else {
          report.recoveryTargetTests.passed++;
        }
      }
    } else {
      // If roundedPct >= 80, classesNeededToRecover must be 0
      if (res.classesNeededToRecover !== 0) {
        report.recoveryTargetTests.failed++;
        report.recoveryTargetTests.failures.push({ A, T, r: res.classesNeededToRecover, reason: "Recovery > 0 when >= 80%" });
      } else {
        report.recoveryTargetTests.passed++;
      }
    }
  }
}
report.totalPairsTested = pairCount;

console.log(`  ✓ Tested ${pairCount.toLocaleString()} total (A, T) pairs from T=1..500.`);
console.log(`  - Category Classification: ${report.categoryClassificationTests.passed} Passed / ${report.categoryClassificationTests.failed} Failed`);
console.log(`  - Missable Buffer Invariant: ${report.missableBufferTests.passed} Passed / ${report.missableBufferTests.failed} Failed`);
console.log(`  - Recovery Target Invariant: ${report.recoveryTargetTests.passed} Passed / ${report.recoveryTargetTests.failed} Failed`);

// 3. WHAT-IF PROJECTION SIMULATION STRESS TEST
console.log("\n--- 3. What-If Projection Simulation Stress Test ---");
let whatIfCount = 0;
const testSimulations = [
  { attended: 35, total: 45, planAtt: 5, planMiss: 0 },
  { attended: 35, total: 45, planAtt: 0, planMiss: 5 },
  { attended: 35, total: 45, planAtt: 10, planMiss: 10 },
  { attended: 20, total: 50, planAtt: 60, planMiss: 0 },
  { attended: 0, total: 0, planAtt: 10, planMiss: 2 },
  { attended: 40, total: 50, planAtt: 0, planMiss: 0 },
  { attended: 40, total: 50, planAtt: 100, planMiss: 100 },
];

for (const sim of testSimulations) {
  whatIfCount++;
  const proj = projectAttendance(sim.attended, sim.total, sim.planAtt, sim.planMiss);
  const base = calculateAttendanceMetrics(sim.attended, sim.total);

  const expAtt = base.attendedSessions + sim.planAtt;
  const expTot = base.totalSessions + sim.planAtt + sim.planMiss;
  const expPct = expTot === 0 ? 100 : Math.round((expAtt / expTot) * 100);
  const expDelta = expPct - base.percentage;

  const passed =
    proj.attendedSessions === expAtt &&
    proj.totalSessions === expTot &&
    proj.percentage === expPct &&
    proj.percentageDelta === expDelta;

  if (passed) {
    report.whatIfSimulationTests.passed++;
    console.log(`  ✓ [PASS] Sim (${sim.attended}/${sim.total} +${sim.planAtt}/-${sim.planMiss}): Base=${base.percentage}% -> Proj=${proj.percentage}% (Δ${proj.percentageDelta >= 0 ? "+" : ""}${proj.percentageDelta}%)`);
  } else {
    report.whatIfSimulationTests.failed++;
    const err = { sim, base, proj, expAtt, expTot, expPct, expDelta };
    report.whatIfSimulationTests.failures.push(err);
    console.error(`  ✗ [FAIL] Sim (${sim.attended}/${sim.total}):`, err);
  }
}

// 4. FLOATING POINT PRECISION STRESS TEST (Large scales: T up to 50,000)
console.log("\n--- 4. Floating Point Precision & Scale Test (T up to 10,000) ---");
let fpFailures = 0;
for (let T = 500; T <= 10000; T += 250) {
  for (let A = 0; A <= T; A += 100) {
    const res = calculateAttendanceMetrics(A, T);
    // Check raw recovery float vs 4T - 5A
    if (res.percentage < 80) {
      const exactRecovery = 4 * T - 5 * A;
      if (res.classesNeededToRecover !== exactRecovery) {
        fpFailures++;
        report.floatingPointPrecisionTests.failures.push({ A, T, resR: res.classesNeededToRecover, exactRecovery });
      }
    }
  }
}
if (fpFailures === 0) {
  report.floatingPointPrecisionTests.passed++;
  console.log("  ✓ Floating point precision check: 0 discrepancies across large-scale tests.");
} else {
  report.floatingPointPrecisionTests.failed++;
  console.error(`  ✗ Floating point precision check failed with ${fpFailures} errors.`);
}

console.log("\n================================================================================");
console.log(`FINAL STRESS TEST RESULT: ${report.boundaryEdgeCaseTests.failed + report.categoryClassificationTests.failed + report.missableBufferTests.failed + report.recoveryTargetTests.failed + report.whatIfSimulationTests.failed + report.floatingPointPrecisionTests.failed === 0 ? "ALL INVARIANTS CERTIFIED (100% PASS)" : "FAILURES DETECTED"}`);
console.log("================================================================================\n");

if (
  report.boundaryEdgeCaseTests.failed > 0 ||
  report.categoryClassificationTests.failed > 0 ||
  report.missableBufferTests.failed > 0 ||
  report.recoveryTargetTests.failed > 0 ||
  report.whatIfSimulationTests.failed > 0 ||
  report.floatingPointPrecisionTests.failed > 0
) {
  process.exit(1);
} else {
  process.exit(0);
}
