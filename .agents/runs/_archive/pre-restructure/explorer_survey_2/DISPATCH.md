## 2026-08-18T14:29:22Z
Read the original request at D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md.
Also read graphify-out/GRAPH_REPORT.md and graphify-out/graph.json to understand the codebase structure per AGENTS.md rules.
You can reference the design intelligence skill at `d:\CLASSROOM OS\.agent\skills\ui-ux-pro-max\SKILL.md`.
Your working directory is: D:\CLASSROOM OS\.agents\explorer_survey_2
Investigate the current design system, styling, typography, and contrast:
1. Inspect `src/app/globals.css`, Tailwind configuration (`tailwind.config.ts` or CSS variables), theme provider, and color tokens for Light and Dark modes.
2. Search for any tiny font usages (`text-[10px]`, `text-[11px]`, `text-xs`) across components and pages, especially on subheads, session notes, topics, teacher names, and status badges.
3. Search for washed-out or low-contrast text colors (`#64748B`, `text-slate-400`, `text-muted-foreground`, etc.) that violate minimum contrast ratios (4.5:1 body, 3:1 headings) in light and dark modes.
4. Write your detailed audit and upgrade plan to `D:\CLASSROOM OS\.agents\explorer_survey_2\analysis.md` and your final handoff to `D:\CLASSROOM OS\.agents\explorer_survey_2\handoff.md`.
