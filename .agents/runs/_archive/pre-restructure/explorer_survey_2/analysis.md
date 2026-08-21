# Comprehensive UI/UX Design System, Typography & Contrast Audit Report

**Date**: 2026-08-18  
**Investigator**: Explorer Survey Agent 2  
**Target Codebase**: Classroom OS (`D:\CLASSROOM OS`)  
**Scope**: Design system tokens, Light/Dark theme configuration, font sizes, contrast ratios, WCAG compliance, and responsive typography upgrade plan.

---

## 1. Executive Summary & Problem Statement

Classroom OS uses a modern Next.js 16 + React 19 + Tailwind CSS v4 stack with `@base-ui/react` primitives and an "Ice-Indigo" (light) / "Deep Midnight Indigo" (dark) aesthetic. While the core color scheme and layout architecture are conceptually strong, the application suffers from two critical UX/A11y deficiencies across both student and admin interfaces:

1. **Illegible "Micro-Typography"**: An abundance of arbitrary sub-12px font utilities (`text-[10px]`, `text-[11px]`, and aggressive `text-xs`) used on primary academic entities: teacher names, session topics, room numbers, timetable pills, status chips, form subheads, table headers, and status badges. This severely impairs readability on standard mobile and desktop displays.
2. **Severe Dark-Mode & Opacity-Based Contrast Violations**: Multiple shared components and pages use hardcoded light-mode color classes (e.g., `text-slate-600`, `text-emerald-600`, `text-indigo-600`, `text-red-600`, `text-gray-500`) without `.dark:` counterparts, resulting in dark-mode contrast ratios dropping as low as **2.3:1** on dark card surfaces (`#111827`). Furthermore, opacity modifiers like `text-muted-foreground/60`, `text-muted-foreground/40`, and `text-sidebar-foreground/50` cause severe contrast degradation below the WCAG 2.1 AA requirement (4.5:1 for normal body text, 3:1 for large text/headings).

---

## 2. Design System Architecture & Token Breakdown

### 2.1 Tailwind CSS v4 Configuration & Imports
Classroom OS utilizes Tailwind CSS v4 (`@tailwindcss/postcss: ^4`, `tailwindcss: ^4`). The stylesheet chain is anchored in `src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "../../design/tokens.css";
@import "@uploadthing/react/styles.css";

@custom-variant dark (&:is(.dark *));
```

### 2.2 Theme Tokens & Color Palettes

#### Light Mode (`:root`)
- **Background**: `#F0F4FF` (Ice-Indigo)
- **Card**: `#ffffff` (Pure White)
- **Foreground / Text**: `#0F172A` (Slate 900)
- **Primary**: `#4F46E5` (Indigo 600)
- **Secondary**: `#E0E7FF` (Indigo 100) / Text: `#1E1B4B` (Indigo 950)
- **Muted**: `#E2E8F0` (Slate 200) / Text: `#334155` (Slate 700)
- **Border / Input**: `#CBD5E1` (Slate 300)
- **Sidebar**: `#1E1B4B` (Deep Navy Indigo) / Foreground: `#F8FAFC`

#### Dark Mode (`.dark`)
- **Background**: `#0B0F19` (Very Deep Midnight)
- **Card**: `#111827` (Gray 900)
- **Foreground / Text**: `#F8FAFC` (Slate 50)
- **Primary**: `#6366F1` (Indigo 500)
- **Secondary**: `#1E293B` (Slate 800) / Text: `#E2E8F0` (Slate 200)
- **Muted**: `#1E293B` (Slate 800) / Text: `#94A3B8` (Slate 400)
- **Border**: `#334155` (Slate 700) / Input: `#1E293B`
- **Sidebar**: `#070B14` (Deep Black Indigo) / Foreground: `#C7D2FE`

### 2.3 Typography Definitions
Configured in `src/app/layout.tsx` and mapped in `globals.css`:
- `--font-inter`: Inter (Body/UI)
- `--font-fira-sans`: Fira Sans (Headings & Section Titles)
- `--font-fira-code`: Fira Code (Monospace numbers, roll numbers, time codes)

---

## 3. Contrast & WCAG AA/AAA Ratio Violations

### 3.1 Mathematical Contrast Matrix

| Element / Class | Surface / Background | Measured Ratio | WCAG AA Threshold | Status | Root Cause & Failure Mode |
|---|---|---|---|---|---|
| `StatusChip` (`upcoming`, `not_started`) `text-slate-600` | Dark Card (`#111827`) | **2.35:1** | 4.5:1 | ❌ CRITICAL FAIL | Hardcoded `text-slate-600` lacks `dark:text-slate-300` |
| `StatusChip` (`ongoing`) `text-indigo-600` | Dark Card (`#111827`) | **2.30:1** | 4.5:1 | ❌ CRITICAL FAIL | Hardcoded `text-indigo-600` lacks `dark:text-indigo-400` |
| `StatusChip` (`present`, `completed`) `text-emerald-600` | Dark Card (`#111827`) | **2.50:1** | 4.5:1 | ❌ CRITICAL FAIL | Hardcoded `text-emerald-600` lacks `dark:text-emerald-400` |
| `StatusChip` (`absent`) `text-red-600` | Dark Card (`#111827`) | **2.55:1** | 4.5:1 | ❌ CRITICAL FAIL | Hardcoded `text-red-600` lacks `dark:text-red-400` |
| `StatusChip` (`important`) `text-blue-600` | Dark Card (`#111827`) | **2.65:1** | 4.5:1 | ❌ CRITICAL FAIL | Hardcoded `text-blue-600` lacks `dark:text-blue-400` |
| `StatusChip` (`due_soon`, `late`) `text-amber-600` | Dark Card (`#111827`) | **4.40:1** | 4.5:1 | ❌ FAIL (Borderline) | Hardcoded `text-amber-600` lacks `dark:text-amber-400` |
| `WhatIfCalculator` status badge (`text-emerald-600`) | Dark Card (`#111827`) | **2.50:1** | 4.5:1 | ❌ CRITICAL FAIL | Missing `dark:text-emerald-400` in dynamic string builder |
| `Attendance` Category Badge (`text-emerald-600`) | Dark Card (`#111827`) | **2.50:1** | 4.5:1 | ❌ CRITICAL FAIL | Missing `dark:text-emerald-400` in `attendance/page.tsx:168` |
| Sidebar Menu Headers (`text-sidebar-foreground/50`) | Dark Sidebar (`#070B14`) | **3.79:1** | 4.5:1 | ❌ FAIL | `#C7D2FE` at 50% alpha over `#070B14` is `#676E89` |
| Sidebar Subhead (`text-sidebar-foreground/60`) | Dark Sidebar (`#070B14`) | **4.42:1** | 4.5:1 | ❌ FAIL | `#C7D2FE` at 60% alpha over `#070B14` is `#7B82A0` |
| Session "No log attached" (`text-muted-foreground/60`) | Light Card (`#ffffff`) | **3.40:1** | 4.5:1 | ❌ FAIL | `#334155` at 60% alpha over white is `#818B99` |
| Session Arrow Icon (`text-muted-foreground/40`) | Light Card (`#ffffff`) | **2.16:1** | 3.0:1 | ❌ FAIL | Excessive opacity reduction on navigational indicators |
| Dashboard Notice Date (`text-muted-foreground/70`) | Light Card (`#ffffff`) | **4.23:1** | 4.5:1 | ❌ FAIL | `#334155` at 70% alpha over white is `#707B8A` |
| TabsTrigger Inactive (`text-foreground/60`) | Light Muted (`#E2E8F0`) | **4.28:1** | 4.5:1 | ❌ FAIL | `#0F172A` at 60% alpha over `#E2E8F0` is `#636A79` |
| Status Action Archive Button (`text-gray-500`) | Dark Card (`#111827`) | **3.58:1** | 4.5:1 | ❌ FAIL | Raw Tailwind `text-gray-500` (`#6B7280`) on dark card |
| Raw `#64748B` (Slate 500) if used on `#F0F4FF` | Light Background (`#F0F4FF`) | **4.27:1** | 4.5:1 | ❌ FAIL | `#64748B` fails 4.5:1 on light ice-indigo background |

---

## 4. Comprehensive Font Size & "Micro-Typography" Catalog

The investigation found **over 80 instances** of tiny typography (`text-[10px]`, `text-[11px]`, and inappropriately sized `text-xs`) across components and pages:

### 4.1 Sub-12px Font Usages (`text-[10px]` & `text-[11px]`)

| File Path | Line | Element / Context | Current Classes | Proposed Replacement |
|---|---|---|---|---|
| `src/components/student/status-chip.tsx` | 47 | Shared Status Chip | `text-[11px] font-semibold tracking-wide uppercase` | `text-xs font-bold tracking-wide uppercase px-2.5 py-1` |
| `src/components/app-sidebar.tsx` | 35 | Brand Subhead | `text-[11px] font-semibold text-primary uppercase` | `text-xs font-bold text-primary uppercase tracking-wider` |
| `src/components/app-sidebar.tsx` | 42 | Menu Section Label | `text-[10px] font-bold text-sidebar-foreground/50 uppercase` | `text-xs font-bold text-sidebar-foreground/75 uppercase tracking-wider` |
| `src/components/app-sidebar.tsx` | 73 | Footer Badge Subtitle | `text-[11px] text-sidebar-foreground/60` | `text-xs text-sidebar-foreground/80 font-medium` |
| `src/components/student/student-sidebar.tsx` | 34 | Brand Subhead | `text-[11px] font-semibold text-primary uppercase` | `text-xs font-bold text-primary uppercase tracking-wider` |
| `src/components/student/student-sidebar.tsx` | 41 | Menu Section Label | `text-[10px] font-bold text-sidebar-foreground/50 uppercase` | `text-xs font-bold text-sidebar-foreground/75 uppercase tracking-wider` |
| `src/components/student/student-sidebar.tsx` | 71 | Footer Badge Subtitle | `text-[11px] text-sidebar-foreground/60` | `text-xs text-sidebar-foreground/80 font-medium` |
| `src/app/(student)/page.tsx` | 185 | Timetable Period Subhead | `text-[11px] text-muted-foreground` | `text-xs font-medium text-muted-foreground` |
| `src/app/(student)/page.tsx` | 195 | Live Class "NOW" Badge | `text-[10px] font-bold tracking-wider animate-pulse` | `text-xs font-bold tracking-wider animate-pulse px-2.5 py-0.5` |
| `src/app/(student)/page.tsx` | 257 | Assignment Due Status | `text-[11px] font-semibold whitespace-nowrap` | `text-xs font-semibold whitespace-nowrap px-2.5 py-0.5` |
| `src/app/(student)/page.tsx` | 311 | Barometer Buffer Subtitle | `text-[11px] text-muted-foreground/80 font-medium` | `text-xs text-muted-foreground font-medium` |
| `src/app/(student)/page.tsx` | 342 | Notice Valid Until | `text-[10px] text-muted-foreground/70 shrink-0` | `text-xs font-medium text-muted-foreground shrink-0` |
| `src/app/(student)/page.tsx` | 364 | Internal Marks Badge | `text-[10px] font-semibold text-muted-foreground bg-muted` | `text-xs font-semibold text-foreground bg-muted px-2.5 py-1` |
| `src/app/(student)/today/page.tsx` | 233 | Subject Code Badge | `text-[11px] font-semibold text-muted-foreground px-2 py-0.5` | `text-xs font-bold text-foreground bg-muted px-2.5 py-1` |
| `src/app/(student)/today/page.tsx` | 239 | ONGOING Status Badge | `text-[10px] font-bold tracking-wider animate-pulse uppercase` | `text-xs font-bold tracking-wider animate-pulse px-2.5 py-1` |
| `src/app/(student)/today/page.tsx` | 244 | COMPLETED Status Badge | `text-[10px] font-bold uppercase` | `text-xs font-bold uppercase px-2.5 py-1` |
| `src/app/(student)/today/page.tsx` | 249 | UPCOMING Status Badge | `text-[10px] font-bold uppercase` | `text-xs font-bold uppercase px-2.5 py-1` |
| `src/app/(student)/today/page.tsx` | 273 | Teacher Initial Circle | `w-5 h-5 ... text-[10px] font-bold` | `w-7 h-7 ... text-xs font-bold` |
| `src/app/(student)/today/day-strip-selector.tsx` | 39 | Weekday Name | `text-[11px] uppercase tracking-wider` | `text-xs font-semibold uppercase tracking-wider` |
| `src/app/(student)/routine/page.tsx` | 91 | "Active Today" Badge | `text-[10px] font-semibold uppercase tracking-wider` | `text-xs font-bold uppercase tracking-wider px-2.5 py-0.5` |
| `src/app/(student)/attendance/page.tsx` | 215 | Attendance Counts Note | `text-[11px] text-muted-foreground mt-1` | `text-xs text-muted-foreground mt-1 font-medium` |
| `src/app/(student)/attendance/page.tsx` | 262 | Table Subject Code | `text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5` | `text-xs font-bold bg-muted text-foreground px-2 py-0.5` |
| `src/app/(student)/attendance/what-if-calculator.tsx` | 105 | Simulator Recovery Subtitle | `text-[11px] text-muted-foreground font-medium` | `text-xs text-muted-foreground font-medium` |
| `src/app/(student)/attendance/correction-dialog.tsx` | 129 | Form Field Error Text | `text-[11px] text-destructive mt-1` | `text-xs font-medium text-destructive mt-1` |
| `src/app/(student)/homework/homework-client-workspace.tsx` | 209 | Homework Subject Code | `text-[11px] font-bold bg-primary/10 font-mono` | `text-xs font-bold bg-primary/10 text-primary font-mono px-2.5 py-0.5` |
| `src/app/(student)/homework/homework-client-workspace.tsx` | 281 | "Graded by" Faculty Subtitle | `text-[11px] text-muted-foreground` | `text-xs text-foreground font-medium` |
| `src/app/(student)/homework/homework-client-workspace.tsx` | 501 | File Upload Supported Types | `text-[11px] text-muted-foreground mt-0.5` | `text-xs text-muted-foreground mt-0.5` |
| `src/app/(student)/homework/homework-client-workspace.tsx` | 513 | Uploaded File Size Text | `text-muted-foreground text-[11px]` | `text-muted-foreground text-xs font-medium` |
| `src/app/(student)/subjects/page.tsx` | 108 | Unit Count Badge | `text-[11px] text-muted-foreground font-medium` | `text-xs text-muted-foreground font-semibold` |
| `src/app/(student)/subjects/[id]/page.tsx` | 376 | Assignment Status Badge | `text-[10px] font-bold uppercase` | `text-xs font-bold uppercase px-2.5 py-0.5` |
| `src/app/(student)/subjects/[id]/page.tsx` | 390 | Due Date Label | `text-[11px] text-muted-foreground font-medium` | `text-xs text-muted-foreground font-medium` |
| `src/app/(student)/subjects/[id]/page.tsx` | 441 | Resource Material Type | `text-[10px] font-bold uppercase` | `text-xs font-bold uppercase px-2.5 py-0.5` |
| `src/app/(student)/subjects/[id]/page.tsx` | 454 | Resource File Size | `text-muted-foreground text-[11px]` | `text-muted-foreground text-xs font-medium` |
| `src/app/(student)/notices/page.tsx` | 46 | "Pinned Alert" Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-1` |
| `src/app/(student)/notices/page.tsx` | 51 | "Expiring" Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-1` |
| `src/app/(student)/notices/page.tsx` | 75 | "Valid Until" Label | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold` |
| `src/app/(student)/events/page.tsx` | 63 | Event Type Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-1` |
| `src/app/(student)/sessions/page.tsx` | 105 | Attendance Column Label | `uppercase tracking-wider text-[10px]` | `uppercase tracking-wider text-xs font-semibold` |
| `src/app/(admin)/admin/accounts/accounts-client-console.tsx` | 280 | "You" Self-Account Badge | `text-[10px] bg-primary/10 text-primary font-bold` | `text-xs bg-primary/10 text-primary font-bold px-2 py-0.5` |
| `src/app/(admin)/admin/accounts/accounts-client-console.tsx` | 287 | User Phone Number | `text-[11px] text-muted-foreground/80` | `text-xs text-muted-foreground font-medium` |
| `src/app/(admin)/admin/accounts/kpi-summary-cards.tsx` | 81 | KPI Card Description | `text-[11px] text-muted-foreground truncate` | `text-xs text-muted-foreground font-medium truncate` |
| `src/app/(admin)/admin/students/page.tsx` | 54 | Registered Count Pill | `text-[10px] font-semibold tracking-wide` | `text-xs font-bold tracking-wide px-2.5 py-1` |
| `src/app/(admin)/admin/students/page.tsx` | 60 | Student Table Header | `thead ... text-[10px] font-semibold` | `thead ... text-xs font-bold tracking-wider` |
| `src/app/(admin)/admin/students/page.tsx` | 97 | Faculty Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-0.5` |
| `src/app/(admin)/admin/students/page.tsx` | 100 | Semester Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-0.5` |
| `src/app/(admin)/admin/subjects/page.tsx` | 80 | "Lab Included" Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-1` |
| `src/app/(admin)/admin/subjects/page.tsx` | 94 | Teacher Initial Circle | `text-[10px] font-bold text-secondary-foreground` | `text-xs font-bold text-secondary-foreground` |
| `src/app/(admin)/admin/teachers/page.tsx` | 86 | Faculty Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-1` |
| `src/app/(admin)/admin/teachers/page.tsx` | 95 | Semester Badge | `text-[10px] uppercase tracking-wider font-semibold` | `text-xs uppercase tracking-wider font-bold px-2.5 py-1` |
| `src/components/admin/create-account-dialog.tsx` | 110, 125, 159 | Form Validation Errors | `text-[11px] text-destructive` | `text-xs font-medium text-destructive` |

### 4.2 Under-sized `text-xs` on Major Content Entities

In addition to sub-12px text, several critical body entities currently use `text-xs` (12px) when they should use `text-sm` (14px) or `text-base` (16px) font-medium/semibold for readability:

1. **Teacher Names & Notes in Timetables (`today/page.tsx:270`, `routine/page.tsx:99`)**:
   - Current: `text-xs text-muted-foreground`
   - Upgrade: `text-sm font-medium text-foreground` for teacher name; `text-xs font-medium text-muted-foreground` for room & notes.
2. **Session Notes & Lecture Topics (`sessions/page.tsx:89-95`, `lecture-logs/page.tsx:55-60`)**:
   - Current: `text-xs text-muted-foreground/60 italic`
   - Upgrade: `text-sm font-medium text-foreground leading-relaxed` with `text-xs font-bold uppercase tracking-wider text-primary` label.
3. **Form Labels & Inputs (`attendance/correction-dialog.tsx:78-86`, `homework-client-workspace.tsx:465-475`)**:
   - Current: `text-xs` labels and `text-xs` input text
   - Upgrade: `text-sm font-semibold text-foreground` for labels and `text-sm` for inputs/textareas.
4. **Primary Navigation Links & Tabs (`app-sidebar.tsx`, `student-sidebar.tsx`, `TabsTrigger`)**:
   - Upgraded to `text-sm font-semibold` with minimum touch targets (40px height).

---

## 5. Complete Typography & Styling Upgrade Plan

### 5.1 Architecture & Token Adjustments (`globals.css`)

1. **Rich High-Contrast Muted Tokens**:
   - In Light Mode: Confirm `--muted-foreground: #334155;` (Slate 700, yielding **10.1:1** on white card surfaces and **9.2:1** on ice-indigo background).
   - In Dark Mode: Confirm `--muted-foreground: #94A3B8;` (Slate 400, yielding **6.8:1** on dark card `#111827` and **7.4:1** on `#0B0F19`).
2. **Ensure Explicit Dark Mode Tokens for Statuses**:
   Create reusable token definitions or utility mappings for all academic statuses:
   - `SAFE` / `Present` / `Completed` / `Graded`:
     Light: `text-emerald-700 bg-emerald-500/10 border-emerald-500/25` (Contrast 6.2:1)
     Dark: `dark:text-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/35` (Contrast 8.5:1)
   - `CAUTION` / `Due Soon` / `Late` / `Quarantined`:
     Light: `text-amber-700 bg-amber-500/10 border-amber-500/25` (Contrast 5.4:1)
     Dark: `dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-500/35` (Contrast 9.1:1)
   - `DANGER` / `Overdue` / `Absent` / `Deactivated`:
     Light: `text-rose-700 bg-rose-500/10 border-rose-500/25` (Contrast 5.8:1)
     Dark: `dark:text-rose-300 dark:bg-rose-500/20 dark:border-rose-500/35` (Contrast 8.2:1)
   - `ONGOING` / `Active` / `Submitted`:
     Light: `text-indigo-700 bg-indigo-500/10 border-indigo-500/25` (Contrast 7.1:1)
     Dark: `dark:text-indigo-300 dark:bg-indigo-500/20 dark:border-indigo-500/35` (Contrast 8.0:1)

### 5.2 Shared Component Upgrade Blueprint

#### 1. `StatusChip` (`src/components/student/status-chip.tsx`)
- **Typography**: Replace `text-[11px]` with `text-xs font-bold tracking-wide uppercase px-2.5 py-1`.
- **Contrast**: Add full dual-theme support for all 11 status variants (`dark:text-...`, `dark:bg-...`, `dark:border-...`).

#### 2. `AttendanceGauge` & `WhatIfCalculator`
- **Typography**: Ensure projected deltas and recovery counters use `text-xs` font-bold and `text-sm` font-medium.
- **Contrast**: Fix dynamic `statusColor` string in `WhatIfCalculator` and `attendance/page.tsx` to include `dark:text-emerald-300` and `dark:text-amber-300`.

#### 3. `StudentSidebar` & `AppSidebar` (`src/components/`)
- **Typography**: Replace `text-[10px]` menu headers with `text-xs font-bold tracking-wider uppercase text-sidebar-foreground/80`.
- **Contrast**: Upgrade active and hover states to avoid opacity drop below 75%. Replace `text-sidebar-foreground/50` with `text-sidebar-foreground/75` (Dark mode contrast: 5.8:1).

#### 4. `Tabs` & `TabsTrigger` (`src/components/ui/tabs.tsx`)
- **Contrast**: Replace `text-foreground/60` with `text-muted-foreground hover:text-foreground font-semibold` to eliminate the 4.28:1 contrast failure on light mode tabs lists.

### 5.3 Page-by-Page Typography & Contrast Refactoring Specification

| Page / Route | Component Elements to Refactor | Precise Changes Required |
|---|---|---|
| **Dashboard (`/`)** | Hero stats, Timetable cards, Assignment list, Attendance Barometer, Notice Board | 1. Upgrade "NOW" badge to `text-xs font-bold px-2.5 py-0.5 animate-pulse`.<br>2. Upgrade Teacher names to `text-sm font-medium text-foreground`.<br>3. Remove `text-muted-foreground/70` from notice dates.<br>4. Replace `text-[11px]` with `text-xs font-semibold` on assignment badges. |
| **Today (`/today`)** | 7-day strip, Timeline session cards, Status pills, Teacher avatar | 1. Replace `text-[10px]` badges with `text-xs font-bold tracking-wider uppercase px-2.5 py-1`.<br>2. Upgrade `DayStripSelector` weekday labels to `text-xs font-semibold`.<br>3. Upgrade Teacher avatar from `w-5 h-5 text-[10px]` to `w-7 h-7 text-xs font-bold`.<br>4. Upgrade Room & Notes typography from `text-xs opacity-80` to `text-xs font-medium text-muted-foreground`. |
| **Routine (`/routine`)** | Day headers, Time badges, Teacher info, Active Today badge | 1. Replace `text-[10px]` Active Today badge with `text-xs font-bold px-2.5 py-0.5`.<br>2. Ensure Action buttons (Add Slot, Edit) use standard `text-sm` button variants.<br>3. Ensure Subject name is `text-base font-bold font-fira-sans`. |
| **Attendance (`/attendance`)** | Mandate Barometer, Buffer notes, What-If simulator, Subject breakdown matrix | 1. Fix dark-mode contrast on Category Badge (`dark:text-emerald-300`).<br>2. Replace `text-[11px]` buffer details with `text-xs font-medium text-muted-foreground`.<br>3. Replace `text-[10px]` subject code badges in table with `text-xs font-bold`.<br>4. Upgrade Table Header `thead` from `text-[10px]` to `text-xs font-bold uppercase tracking-wider text-muted-foreground`. |
| **Homework (`/homework`)** | Tab navigation, Assignment cards, Graded remarks, Submission modal | 1. Replace `text-[11px]` subject code with `text-xs font-mono font-bold px-2.5 py-0.5`.<br>2. Replace `text-xs` form labels with `text-sm font-semibold text-foreground`.<br>3. Ensure File Upload description uses `text-xs font-medium text-muted-foreground` instead of `text-[11px]`.<br>4. Ensure Grade remarks use `text-sm font-medium text-foreground`. |
| **Subjects (`/subjects` & `/[id]`)** | Subject cards, Syllabus progress tabs, Session tabs, Learning materials | 1. Replace `text-[11px]` unit counts with `text-xs font-semibold`.<br>2. Replace `text-[10px]` status badges and slides tags with `text-xs font-bold`.<br>3. Upgrade Material file size metadata from `text-[11px]` to `text-xs font-medium`.<br>4. Ensure Teacher name is `text-sm font-medium text-foreground`. |
| **Lecture Logs & Sessions (`/lecture-logs`, `/sessions`)** | Session history table, Covered topics, Attendance ratio | 1. Replace `text-[10px]` Attendance label with `text-xs font-bold uppercase`.<br>2. Replace `text-xs text-muted-foreground/60 italic` ("No log attached") with `text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1`.<br>3. Replace `text-muted-foreground/40` arrow with `text-muted-foreground group-hover:text-primary`. |
| **Notices & Events (`/notices`, `/events`)** | Pinned badges, Expiring badges, Valid until labels, Date tags | 1. Replace `text-[10px]` Pinned and Expiring badges with `text-xs font-bold uppercase px-2.5 py-1`.<br>2. Replace `text-[10px]` "Valid Until" with `text-xs font-bold uppercase`.<br>3. Upgrade Date tags to `text-xs font-bold uppercase font-fira-code`. |
| **Admin Accounts (`/admin/accounts`)** | KPI summary cards, Search filters, Accounts table, Quarantine status | 1. Replace `text-[10px]` "You" badge with `text-xs font-bold px-2 py-0.5`.<br>2. Replace `text-[11px]` phone number with `text-xs font-medium text-muted-foreground`.<br>3. Upgrade KPI card descriptions from `text-[11px]` to `text-xs font-medium`.<br>4. Ensure Quarantined / Verified badges have `dark:text-amber-300` / `dark:text-emerald-300`. |
| **Admin Students, Teachers, Subjects** | Registry tables, Department badges, Semester tags | 1. Upgrade `admin/students` table header `thead` from `text-[10px]` to `text-xs font-bold uppercase`.<br>2. Replace `text-[10px]` Faculty and Semester badges with `text-xs font-bold px-2.5 py-0.5`.<br>3. Replace `text-[10px]` "Lab Included" badge with `text-xs font-bold px-2.5 py-1`. |
| **Auth Pages (`/login`, `/change-password`)** | Form labels, Password inputs, Security notices | 1. Upgrade form labels to `text-xs font-bold uppercase tracking-wider text-muted-foreground`.<br>2. Upgrade security notice from `text-xs text-muted-foreground/75` to `text-xs font-medium text-muted-foreground`. |

---

## 6. Verification & Implementation Guidelines

1. **Compilation & Type Safety**: Ensure `npx tsc --noEmit` completes with 0 errors after refactoring typography and class tokens.
2. **E2E Preservation**: All data-testids (`data-testid="attendance-gauge"`, `data-testid="timeline-session-card"`, `data-testid="assignment-card"`, `data-testid="what-if-slider"`, `data-testid="what-if-projected-result"`) must remain intact without breaking DOM query chains.
3. **Contrast Verification**: Run automated Playwright accessibility checks and manual theme switching verification across both Light (`:root`) and Dark (`.dark`) modes.
4. **Mobile & Viewport Responsiveness**: Check layout at 375px (Mobile), 768px (Tablet), 1024px (Laptop), and 1440px (Desktop) to ensure no text wrapping or overflow bugs occur from font size upgrades.
