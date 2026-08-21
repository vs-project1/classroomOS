/**
 * Tribhuvan University (TU) 80% Attendance Domain Calculator
 * Location: src/lib/attendance.ts
 */

export type AttendanceCategory = "SAFE" | "CAUTION" | "DANGER";

export interface AttendanceMetrics {
  totalSessions: number;
  attendedSessions: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
  percentage: number;
  category: AttendanceCategory;
  missableSessions: number;
  classesNeededToRecover: number;
  threshold: number;
}

export interface ProjectedAttendanceResult extends AttendanceMetrics {
  percentageDelta: number;
  plannedAttended: number;
  plannedMissed: number;
}

/**
 * Calculates academic attendance metrics according to Tribhuvan University's 80% attendance mandate.
 *
 * Formulas:
 * - Percentage: round((attended / total) * 100)
 * - Missable Sessions: floor((attended / threshold_ratio) - total) -> floor(1.25 * A - T) for 80%
 * - Classes Needed to Recover: ceil((threshold_ratio * total - attended) / (1 - threshold_ratio)) -> 4T - 5A for 80%
 * - Zone Categorization:
 *   - SAFE: >= threshold% (>= 80%)
 *   - CAUTION: (threshold - 5)% to < threshold% (75% to 79%)
 *   - DANGER: < (threshold - 5)% (< 75%)
 */
export function calculateAttendanceMetrics(
  attended: number,
  total: number,
  breakdown?: { late?: number; excused?: number; absent?: number },
  threshold: number = 80
): AttendanceMetrics {
  const safeAttended = Math.max(0, Math.floor(attended || 0));
  const safeTotal = Math.max(safeAttended, Math.floor(total || 0));
  const safeLate = Math.max(0, Math.floor(breakdown?.late ?? 0));
  const safeExcused = Math.max(0, Math.floor(breakdown?.excused ?? 0));
  const safeAbsent = Math.max(0, Math.floor(breakdown?.absent ?? Math.max(0, safeTotal - safeAttended)));

  if (safeTotal === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
      lateSessions: 0,
      excusedSessions: 0,
      percentage: 100,
      category: "SAFE",
      missableSessions: 0,
      classesNeededToRecover: 0,
      threshold,
    };
  }

  const percentage = Math.round((safeAttended / safeTotal) * 100);
  const exactRatio = safeAttended / safeTotal;
  const k = threshold / 100;

  // Category classification on the EXACT ratio — rounding before classifying
  // let 79.6% (e.g. 199/250) pass as SAFE against the TU 80% mandate.
  let category: AttendanceCategory = "SAFE";
  if (exactRatio < k - 0.05) {
    category = "DANGER"; // < threshold - 5pp
  } else if (exactRatio < k) {
    category = "CAUTION"; // [threshold - 5pp, threshold)
  } else {
    category = "SAFE"; // >= threshold
  }

  // Missable buffer: floor(A / k - T) where k = threshold / 100
  const rawMissable = Math.floor(safeAttended / k - safeTotal);
  const missableSessions = exactRatio >= k ? Math.max(0, rawMissable) : 0;

  // Recovery target: ceil((k * T - A) / (1 - k)) -> 4T - 5A for k = 0.8
  const rawRecovery = Math.ceil((k * safeTotal - safeAttended) / (1 - k));
  const classesNeededToRecover = exactRatio < k ? Math.max(0, rawRecovery) : 0;

  return {
    totalSessions: safeTotal,
    attendedSessions: safeAttended,
    absentSessions: safeAbsent,
    lateSessions: safeLate,
    excusedSessions: safeExcused,
    percentage,
    category,
    missableSessions,
    classesNeededToRecover,
    threshold,
  };
}

/**
 * Simulates attendance trajectory given planned attended and missed classes.
 */
export function projectAttendance(
  attended: number,
  total: number,
  plannedAttended: number,
  plannedMissed: number,
  threshold: number = 80
): ProjectedAttendanceResult {
  const safePlannedAttended = Math.max(0, Math.floor(plannedAttended || 0));
  const safePlannedMissed = Math.max(0, Math.floor(plannedMissed || 0));

  const baseMetrics = calculateAttendanceMetrics(attended, total, undefined, threshold);

  const projectedAttendedCount = baseMetrics.attendedSessions + safePlannedAttended;
  const projectedTotalCount = baseMetrics.totalSessions + safePlannedAttended + safePlannedMissed;

  const projectedMetrics = calculateAttendanceMetrics(
    projectedAttendedCount,
    projectedTotalCount,
    undefined,
    threshold
  );

  return {
    ...projectedMetrics,
    plannedAttended: safePlannedAttended,
    plannedMissed: safePlannedMissed,
    percentageDelta: projectedMetrics.percentage - baseMetrics.percentage,
  };
}
