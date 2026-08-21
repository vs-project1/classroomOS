## 2026-08-18T14:38:57Z
Read ORIGINAL_REQUEST.md at D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\CLASSROOM OS\PROJECT.md.
Read Explorer 2 analysis and handoff at D:\CLASSROOM OS\.agents\explorer_survey_2\analysis.md and D:\CLASSROOM OS\.agents\explorer_survey_2\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your working directory is: D:\CLASSROOM OS\.agents\worker_m2
Your task is to implement Milestone 2: Design System, Tokens, Typography & Contrast Hardening:
1. In `src/components/student/status-chip.tsx`:
   - Upgrade typography from `text-[11px]` to `text-xs font-bold tracking-wide uppercase px-2.5 py-0.5`.
   - Add explicit dark mode classes for all status variants to guarantee >= 4.5:1 contrast in both light and dark modes:
     * `present`, `completed`: `text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/70 dark:border-emerald-800`
     * `absent`: `text-red-800 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-950/70 dark:border-red-800`
     * `late`, `due_soon`, `high_priority`: `text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-950/70 dark:border-amber-800`
     * `ongoing`: `text-indigo-800 bg-indigo-100 border-indigo-300 dark:text-indigo-300 dark:bg-indigo-950/70 dark:border-indigo-800`
     * `important`: `text-blue-800 bg-blue-100 border-blue-300 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800`
     * `upcoming`, `not_started`: `text-slate-800 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-800/80 dark:border-slate-700`
2. In `src/components/ui/tabs.tsx`:
   - Replace low-contrast `text-foreground/60` with `text-muted-foreground` and ensure active state is crisp `data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm`.
3. In `src/app/(student)/attendance/what-if-calculator.tsx`:
   - Ensure status colors have dual-theme tokens (`text-emerald-700 dark:text-emerald-400`, `text-amber-700 dark:text-amber-400`).
4. In `src/app/(student)/attendance/page.tsx`:
   - Replace any hardcoded single-theme status colors (lines 166-172) with dual-theme classes.
5. In `src/app/(student)/homework/status-actions.tsx` & `src/app/(admin)/admin/homework/status-actions.tsx`:
   - Replace hardcoded `text-gray-500` with `text-muted-foreground`.
6. Run `npx tsc --noEmit` and `npm run db:verify`.
7. Write your handoff to `D:\CLASSROOM OS\.agents\worker_m2\handoff.md`.
