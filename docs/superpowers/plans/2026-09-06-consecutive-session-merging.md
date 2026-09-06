# Consecutive Session Merging & Routine Timings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically merge consecutive routine periods of the same subject into a single session card and lock in routine-driven timings without manual time entry.

**Architecture:** In `SessionForm`, day routine slots sorted by `startTime` are reduced into contiguous `MergedClassBlock` items if they share the same `subjectId` and `lastBlock.endTime === currentSlot.startTime`. Selecting a block sets the start and end times automatically, replaces manual time inputs with a locked visual timing indicator, and passes `startTime` and `endTime` through hidden inputs.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Next.js 16.

## Global Constraints
- Zero-regression typecheck verification (`npx tsc --noEmit` must pass with 0 errors).
- Subagents (`TeacherVerifier`, `CRVerifier`, `StudentVerifier`) must verify all roles.

---

### Task 1: Implement Block Merging & Timing Lock in `SessionForm`

**Files:**
- Modify: `src/features/sessions/components/session-form.tsx`

**Interfaces:**
- Produces: `MergedClassBlock` type and merging logic in `SessionForm`.

- [ ] **Step 1: Define `MergedClassBlock` & Merging Algorithm**
Add `mergedDayBlocks` calculation in `useMemo` from `availableSlots`.

- [ ] **Step 2: Update Card Selection & Replace Manual Time Inputs**
Update card rendering to display period count (`Double Period (2 Periods)` vs `Single Period (1 Period)`).
Render hidden inputs `<input type="hidden" name="startTime" value={startTime} />` and `<input type="hidden" name="endTime" value={endTime} />`.
Render locked timing badge:
```tsx
<div className="h-10 px-3.5 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between text-xs">
  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
    <Clock className="h-3.5 w-3.5 text-primary" /> Timings:
  </span>
  <span className="font-bold text-foreground">
    {formatTime12h(startTime)} – {formatTime12h(endTime)}
    {selectedBlock?.periodCount > 1 ? ` (${selectedBlock.periodCount} Periods)` : ""}
  </span>
</div>
```

- [ ] **Step 3: Run Typecheck**
Run `npx tsc --noEmit`

---

### Task 2: Verification, Subagents & Documentation

**Files:**
- Audit: Teacher and CR session logging
- Modify: `LEARNINGS.md`
- Modify: `walkthrough.md`

- [ ] **Step 1: Strict Typecheck Verification**
Run `npx tsc --noEmit` with 0 errors.

- [ ] **Step 2: Subagent Audits**
Dispatch `TeacherVerifier`, `CRVerifier`, and `StudentVerifier`.

- [ ] **Step 3: Document Learning**
Append Learning #21 to `LEARNINGS.md`.
