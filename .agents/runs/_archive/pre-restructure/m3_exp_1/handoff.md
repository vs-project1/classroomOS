# Technical Exploration & Architecture Report: TU 80% Attendance Domain & Barometer Hub

**Author**: `m3_exp_1` (teamwork_preview_explorer)  
**Target Milestone**: Milestone 3 (Academic Domain & Primary Student Views)  
**Scope**: F9 (TU 80% Attendance Domain), F10 (What-If Projection Calculator), F15 (Attendance Hub & Correction Flow)  
**Date**: 2026-08-18  

---

## 1. Observation

### 1.1 Existing Codebase & Schema Analysis
Direct inspection of the repository revealed the following architectural facts:

1. **Schema & Tables (`src/db/schema.ts`)**:
   - `attendance` table (lines 102–118):
     - Foreign keys: `classSessionId` (references `classSessions.id`), `studentId` (references `students.id`).
     - Composite unique constraint: `unique("unq_attendance_session_student").on(table.classSessionId, table.studentId)`.
     - Status check constraint: `chk_attendance_status: IN ('present', 'absent', 'late', 'excused')`.
   - `attendanceCorrectionRequests` table (lines 465–493):
     - Foreign keys: `attendanceId` (references `attendance.id`), `studentId` (references `students.id`), `reviewedBy` (references `teachers.id`).
     - Requested status constraint: `chk_attendance_correction_requested_status: IN ('present', 'excused')`.
     - Request lifecycle status: `chk_attendance_correction_status: IN ('pending', 'approved', 'rejected')` (default `'pending'`).
     - Includes `reason`, `reviewNote`, `reviewedAt`, `createdAt`, `updatedAt`.
   - `enrollments` table (lines 280–298):
     - Maps `studentId` to `subjectId` with `chk_enrollments_semester: BETWEEN 1 AND 8`.

2. **Current Implementation Deficiencies (`src/app/(student)/attendance/page.tsx`)**:
   - Currently, `/attendance/page.tsx` is an early prototype (174 lines) with hardcoded in-file math:
     - Line 42: `const overallPercentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;`
     - Line 77: `const safeBuffer = Math.max(0, Math.floor((presentClasses - (0.80 * totalClasses)) / 0.80));`
   - **Missing Features**:
     - No separate domain service module (`src/lib/attendance.ts` is missing from `src/lib/`).
     - No recovery calculation when attendance is $<80\%$ (only shows "At Risk (<80%)").
     - No `SAFE` / `CAUTION` / `DANGER` standardized category classification with color chips.
     - No interactive "What-If Projection Calculator" card with range sliders/inputs.
     - No Attendance Session History log displaying chronological lectures and attendance statuses.
     - No "Report Incorrect Attendance" modal / dispute flow or server action for `attendance_correction_requests`.

3. **E2E Test Specifications (`tests/e2e/attendance-barometer.spec.ts` & `tests/fixtures/pom/attendance.page.ts`)**:
   - `TC-SPEC-ATT-01`: Requires overall percentage text (`span.tabular-nums`, `[data-testid='overall-percentage']`) and status chip (`SAFE`, `CAUTION`, `DANGER`, `Good Standing`, `At Risk`).
   - `TC-SPEC-ATT-02`: Requires safety buffer text containing `/Safety Buffer|missable|recover/i`.
   - `TC-SPEC-ATT-03`: Requires subject breakdown table rows (`table tbody tr`) $\ge 1$.
   - `TC-SPEC-ATT-04` & `TC-SPEC-ATT-05`: Requires What-If slider (`input[type='range']`, `[data-testid='what-if-slider']`) and projected percentage text (`[data-testid='what-if-projected-result']`).
   - `TC-SPEC-ATT-06`: Requires dispute flow with button (`/Report Incorrect Attendance|Request Correction|Report Issue|Dispute/i`), `textarea[name='reason']`, `select[name='requestedStatus']`, and `button[type='submit']` (`/Submit Request|Submit|Save/i`), expecting a confirmation toast or element with "submitted" / "Pending".

---

## 2. Logic Chain

### 2.1 Tribhuvan University 80% Attendance Mathematical Derivation
Tribhuvan University (BCA/CSIT) mandates a strict $80\%$ minimum attendance threshold for eligibility to sit for final semester board examinations.

Let:
- $A$ = total number of attended sessions ($A \ge 0$)
- $T$ = total number of logged sessions ($T \ge A \ge 0$)
- $k = 0.80$ (standard TU threshold ratio)

#### 1. Baseline Percentage ($P$)
$$P = \begin{cases} 0 & \text{if } T = 0 \\ \operatorname{round}\left(\frac{A}{T} \times 100\right) & \text{if } T > 0 \end{cases}$$

#### 2. Missable Buffer Formula ($M$)
When $P \ge 80\%$, $M$ represents the maximum number of consecutive future lectures a student can miss without dropping below $80\%$.
If a student misses $M$ future lectures, attended count remains $A$, but total classes becomes $T + M$.
The condition $\frac{A}{T + M} \ge 0.80$ yields:
$$A \ge 0.80(T + M) \implies A - 0.80T \ge 0.80M \implies M \le \frac{A - 0.80T}{0.80} = \frac{A}{0.80} - T = 1.25A - T$$
Because $M$ must be a discrete non-negative integer:
$$M = \begin{cases} \lfloor 1.25A - T \rfloor & \text{if } P \ge 80\% \\ 0 & \text{if } P < 80\% \end{cases}$$
*Verification*: For $A=10, T=10 \implies 1.25(10) - 10 = 2.5 \implies M=2$. Missing 2 classes gives $\frac{10}{12} = 83.33\% \ge 80\%$; missing 3 gives $\frac{10}{13} = 76.92\% < 80\%$. Formula is exact.

#### 3. Classes Needed to Recover Formula ($R$)
When $P < 80\%$, $R$ represents the minimum number of consecutive future lectures a student must attend (with 0 misses) to raise their attendance to $\ge 80\%$.
If a student attends $R$ consecutive classes, attended becomes $A + R$, and total becomes $T + R$.
The condition $\frac{A + R}{T + R} \ge 0.80$ yields:
$$A + R \ge 0.80(T + R) \implies R - 0.80R \ge 0.80T - A \implies 0.20R \ge 0.80T - A \implies R \ge \frac{0.80T - A}{0.20} = 4T - 5A$$
Because $T$ and $A$ are integers, $4T - 5A$ is an exact integer:
$$R = \begin{cases} \max(0, 4T - 5A) & \text{if } P < 80\% \\ 0 & \text{if } P \ge 80\% \end{cases}$$
*Verification*: For $A=7, T=10 \implies 4(10) - 5(7) = 5$. Attending 5 classes gives $\frac{7+5}{10+5} = \frac{12}{15} = 80.0\%$. Formula is exact.

#### 4. Zone Classification
| Category | Attendance Range ($P$) | Meaning & Action | UI Palette |
|---|---|---|---|
| **`SAFE`** | $P \ge 80\%$ | Fully compliant with TU board exam rules. Displays missable buffer $+M$. | Emerald / Green |
| **`CAUTION`** | $75\% \le P < 80\%$ | Warning zone. Within reachable distance; displays recovery target $+R$. | Amber / Yellow |
| **`DANGER`** | $P < 75\%$ | Critical exam disqualification risk. Displays recovery target $+R$. | Rose / Destructive Red |

#### 5. "What-If" Projection Calculator
Given planned additional attended classes $\Delta A \ge 0$ and planned missed classes $\Delta M \ge 0$:
$$\text{projectedAttended} = A + \Delta A$$
$$\text{projectedTotal} = T + \Delta A + \Delta M$$
$$\text{projectedPercentage} = \text{projectedTotal} > 0 ? \operatorname{round}\left(\frac{\text{projectedAttended}}{\text{projectedTotal}} \times 100\right) : 0$$
$$\text{percentageDelta} = \text{projectedPercentage} - P$$

---

## 3. Recommended Code Architectures & Proposals

### 3.1 Pure Domain Service: `src/lib/attendance.ts`
This service must be pure TypeScript (no database or React dependencies), allowing universal usage across Server Components, Client Components, and verification test scripts.

```typescript
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

export function calculateAttendanceMetrics(
  attended: number,
  total: number,
  breakdown?: { late?: number; excused?: number; absent?: number },
  threshold: number = 80
): AttendanceMetrics {
  const safeAttended = Math.max(0, Math.floor(attended));
  const safeTotal = Math.max(safeAttended, Math.floor(total));
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

  // Category classification
  let category: AttendanceCategory = "SAFE";
  if (percentage < threshold - 5) {
    category = "DANGER"; // < 75%
  } else if (percentage < threshold) {
    category = "CAUTION"; // 75% to 79%
  } else {
    category = "SAFE"; // >= 80%
  }

  // Missable buffer: floor(1.25 * A - T) for 80% threshold
  const k = threshold / 100;
  const rawMissable = Math.floor((safeAttended / k) - safeTotal);
  const missableSessions = percentage >= threshold ? Math.max(0, rawMissable) : 0;

  // Recovery target: ceil((k * T - A) / (1 - k)) -> 4T - 5A for 80% threshold
  const rawRecovery = Math.ceil((k * safeTotal - safeAttended) / (1 - k));
  const classesNeededToRecover = percentage < threshold ? Math.max(0, rawRecovery) : 0;

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

export function projectAttendance(
  attended: number,
  total: number,
  plannedAttended: number,
  plannedMissed: number,
  threshold: number = 80
): ProjectedAttendanceResult {
  const safePlannedAttended = Math.max(0, Math.floor(plannedAttended));
  const safePlannedMissed = Math.max(0, Math.floor(plannedMissed));

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
```

---

### 3.2 Server Actions for Dispute Resolution: `src/app/(student)/attendance/actions.ts`
Adhering to Rule 4 (React 19 Server Actions, Zod validation, standardized response shape):

```typescript
"use server";

import { db } from "@/db";
import { attendance, attendanceCorrectionRequests, students } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DisputeSchema = z.object({
  attendanceId: z.string().min(1, "Attendance session is required"),
  requestedStatus: z.enum(["present", "excused"], {
    message: "Requested status must be present or excused",
  }),
  reason: z.string().trim().min(5, "Please provide a valid explanation for the correction request"),
});

export type AttendanceActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitAttendanceCorrectionAction(
  prevState: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STUDENT" && user.role !== "CR")) {
    return { success: false, message: "Unauthorized. Student session required." };
  }

  // Resolve student record
  const student = await db.query.students.findFirst({
    where: eq(students.email, user.email),
  });

  if (!student) {
    return { success: false, message: "Student academic profile not found." };
  }

  const raw = {
    attendanceId: formData.get("attendanceId"),
    requestedStatus: formData.get("requestedStatus"),
    reason: formData.get("reason"),
  };

  const parsed = DisputeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please check form inputs.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { attendanceId, requestedStatus, reason } = parsed.data;

  // Verify attendance record ownership
  const targetAttendance = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.id, attendanceId),
      eq(attendance.studentId, student.id)
    ),
  });

  if (!targetAttendance) {
    return { success: false, message: "Attendance record not found or does not belong to you." };
  }

  try {
    const correctionId = `att_corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(attendanceCorrectionRequests).values({
      id: correctionId,
      attendanceId,
      studentId: student.id,
      requestedStatus,
      reason,
      status: "pending",
    });

    revalidatePath("/attendance");
    return {
      success: true,
      message: "Attendance correction request submitted successfully. Status: Pending review.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to record dispute request.",
    };
  }
}
```

---

### 3.3 Component Architecture & Interactive Widgets

```
src/app/(student)/attendance/
├── page.tsx                    # Server Component: data fetching, metric synthesis, layout grid
├── actions.ts                  # Server Actions: submitAttendanceCorrectionAction
├── what-if-calculator.tsx      # Client Component: interactive slider simulation
└── correction-dialog.tsx       # Client Component: modal dialog for reporting incorrect attendance
```

#### Widget 1: Interactive What-If Calculator (`what-if-calculator.tsx`)
```tsx
"use client";

import { useState } from "react";
import { projectAttendance } from "@/lib/attendance";
import { Slider } from "@/components/ui/slider"; // or standard input range
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface WhatIfCalculatorProps {
  initialAttended: number;
  initialTotal: number;
}

export function WhatIfCalculator({ initialAttended, initialTotal }: WhatIfCalculatorProps) {
  const [plannedAttended, setPlannedAttended] = useState<number>(0);
  const [plannedMissed, setPlannedMissed] = useState<number>(0);

  const projected = projectAttendance(initialAttended, initialTotal, plannedAttended, plannedMissed);

  const statusColor =
    projected.category === "SAFE"
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      : projected.category === "CAUTION"
      ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
      : "text-destructive bg-destructive/10 border-destructive/20";

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base">What-If Projection Simulator</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}>
            {projected.category}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Simulate how attending or missing future classes affects your semester standing.
        </p>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span>Future Classes to Attend</span>
              <span className="font-bold tabular-nums text-emerald-600">+{plannedAttended} classes</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={plannedAttended}
              data-testid="what-if-slider"
              onChange={(e) => setPlannedAttended(parseInt(e.target.value, 10) || 0)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span>Future Classes to Miss</span>
              <span className="font-bold tabular-nums text-destructive">+{plannedMissed} missed</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={plannedMissed}
              onChange={(e) => setPlannedMissed(parseInt(e.target.value, 10) || 0)}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-destructive"
            />
          </div>
        </div>
      </div>

      {/* Projection Output */}
      <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground block">Projected Percentage</span>
          <span
            data-testid="what-if-projected-result"
            className="text-3xl font-bold tabular-nums tracking-tight"
          >
            {projected.percentage}%
          </span>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-xs font-bold">
            {projected.percentageDelta > 0 ? (
              <span className="text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{projected.percentageDelta}%
              </span>
            ) : projected.percentageDelta < 0 ? (
              <span className="text-destructive flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> {projected.percentageDelta}%
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Minus className="w-3.5 h-3.5" /> 0%
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {projected.category === "SAFE"
              ? `+${projected.missableSessions} missable classes`
              : `Need ${projected.classesNeededToRecover} classes to recover`}
          </span>
        </div>
      </div>
    </div>
  );
}
```

#### Widget 2: Attendance Dispute & Correction Dialog (`correction-dialog.tsx`)
```tsx
"use client";

import { useActionState, useState } from "react";
import { submitAttendanceCorrectionAction, AttendanceActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

interface CorrectionDialogProps {
  recentSessions: Array<{
    id: string;
    dateFormatted: string;
    subjectName: string;
    status: string;
  }>;
}

const initialState: AttendanceActionState = { success: false };

export function CorrectionDialog({ recentSessions }: CorrectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(submitAttendanceCorrectionAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <ShieldAlert className="w-3.5 h-3.5" />
          Report Incorrect Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Attendance Correction</DialogTitle>
        </DialogHeader>

        {state.success ? (
          <div className="py-6 flex flex-col items-center text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="font-semibold text-sm">Dispute Request Submitted</p>
            <p className="text-xs text-muted-foreground">{state.message}</p>
            <Button onClick={() => setOpen(false)} className="mt-4" size="sm">
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4 pt-2">
            {state.message && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <div>
              <label htmlFor="attendanceId" className="block text-xs font-semibold mb-1">
                Select Lecture Session
              </label>
              <select
                name="attendanceId"
                id="attendanceId"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {recentSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectName} ({s.dateFormatted}) — Marked {s.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="requestedStatus" className="block text-xs font-semibold mb-1">
                Requested Status
              </label>
              <select
                name="requestedStatus"
                id="requestedStatus"
                defaultValue="present"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="present">Present</option>
                <option value="excused">Excused (Medical / College Event)</option>
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-xs font-semibold mb-1">
                Reason & Evidence
              </label>
              <textarea
                name="reason"
                id="reason"
                rows={3}
                required
                placeholder="I was present in Room 302 for DSA lecture on 2026-08-10, please verify with CR log."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Caveats

1. **No-Session / Initial State Handling**:
   - If a student has 0 logged classes in the semester, `calculateAttendanceMetrics` defaults to `100%` / `SAFE` with 0 missable buffer, and the UI should render an informative empty state informing the student that metrics activate once faculty log sessions.
2. **Attendance Status Weighting**:
   - In standard TU BCA regulations, only `status === 'present'` confers full attendance credit for exam eligibility. `late` and `excused` can be categorized separately for academic advising, but are treated as non-present in raw exam threshold computation unless approved via dispute.
3. **Database Integrity & Authorization**:
   - Student authorization must be enforced via `resolveCurrentStudent()`. Never allow a student to submit dispute requests for attendance IDs that belong to another student.
4. **Timezone Formatting**:
   - All session dates displayed on `/attendance` must use `Asia/Kathmandu` formatting (e.g. `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' })` or `en-US` with NPT).

---

## 5. Conclusion

1. **Domain Engine**: The mathematical formulation for the TU 80% rule ($M = \lfloor 1.25A - T \rfloor$, $R = 4T - 5A$) is exact, closed-form, and deterministic. It should be encapsulated in `src/lib/attendance.ts`.
2. **Page Decomposition**: The `/attendance` route should be composed of:
   - Server Component (`src/app/(student)/attendance/page.tsx`): fetches student attendance, enrollments, and correction requests.
   - Domain Barometer Card: utilizes `AttendanceGauge`, displays percentage, `SAFE`/`CAUTION`/`DANGER` chip, and missable/recovery counts.
   - What-If Calculator (`what-if-calculator.tsx`): reactive client simulator with sliders.
   - Subject Matrix Table: lists all enrolled subjects with progress bars and zone badges.
   - History & Dispute Flow (`correction-dialog.tsx` and `actions.ts`): enables students to submit corrections to `attendance_correction_requests`.
3. **Test Compatibility**: All Playwright locators (`data-testid='what-if-slider'`, `data-testid='what-if-projected-result'`, `textarea[name='reason']`, `select[name='requestedStatus']`, table rows, and status chips) are directly supported by this design.

---

## 6. Verification Method

To independently verify the implementation once coded:

1. **Unit Test / Domain Math Verification**:
   Execute a tsx script evaluating `calculateAttendanceMetrics` and `projectAttendance`:
   ```bash
   npx tsx -e '
     import { calculateAttendanceMetrics, projectAttendance } from "./src/lib/attendance";
     console.assert(calculateAttendanceMetrics(10, 10).missableSessions === 2, "10/10 missable should be 2");
     console.assert(calculateAttendanceMetrics(7, 10).classesNeededToRecover === 5, "7/10 recovery should be 5");
     console.assert(calculateAttendanceMetrics(8, 10).category === "SAFE", "80% should be SAFE");
     console.assert(calculateAttendanceMetrics(7, 10).category === "DANGER", "70% should be DANGER");
     console.log("Domain math verified!");
   '
   ```

2. **TypeScript Compilation**:
   ```bash
   npx tsc --noEmit
   ```

3. **E2E Playwright Attendance Spec**:
   ```bash
   npx playwright test tests/e2e/attendance-barometer.spec.ts
   ```
