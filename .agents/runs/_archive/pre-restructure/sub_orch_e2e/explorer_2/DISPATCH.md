## 2026-08-15T12:43:22Z

<USER_REQUEST>
You are Explorer 2 (Spec Miner) designing the 4-tier test case methodology and specification for the E2E Testing Track of Classroom OS.
Your working directory is: D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_2
Read:
- D:\CLASSROOM OS\.agents\ORIGINAL_REQUEST.md
- D:\CLASSROOM OS\PROJECT.md
- D:\CLASSROOM OS\AGENTS.md
- D:\CLASSROOM OS\.agents\AGENTS.md
- D:\CLASSROOM OS\.agents\sub_orch_e2e\SCOPE.md

Tasks:
1. Enumerate all features across Classroom OS (F1 to F19) and design a rigorous 4-tier opaque-box test strategy:
   - Tier 1: Feature Coverage (>=5 test cases per feature covering happy paths and representative inputs)
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature covering edge cases, limit conditions, invalid states, empty inputs)
   - Tier 3: Cross-Feature Combinations (pairwise interactions, e.g., session creation triggering homework generation, attendance changes affecting What-If barometer, quarantine password change unlocking dashboard)
   - Tier 4: Real-World Application Scenarios (end-to-end multi-step user journeys: Student daily morning routine, At-Risk student attendance recovery flow, Assignment submission and grading lifecycle)
2. Detail the exact test case tables, Category-Partition parameters, BVA points, and expected outcomes for each of the 5 target spec files:
   - `auth-lifecycle.spec.ts`
   - `dashboard-schedule.spec.ts`
   - `attendance-barometer.spec.ts`
   - `homework-submissions.spec.ts`
   - `subject-isolation.spec.ts`
3. Produce the draft structure for `TEST_INFRA.md`.
4. Output your complete test matrix and methodology report to `D:\CLASSROOM OS\.agents\sub_orch_e2e\explorer_2\handoff.md`.
5. Send a completion message to parent orchestrator.
</USER_REQUEST>
