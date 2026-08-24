import { describe, expect, it } from "vitest";
import {
  computeCategoryStats,
  computeCategoryValue,
  computeSubjectGrade,
  resolveBand,
  round2,
} from "./compute";
import { DEFAULT_WEIGHTS, GRADE_CATEGORIES } from "./constants";
import type { CategoryInput, GradeBand, GradeItem } from "./types";

const LETTER_BANDS: GradeBand[] = [
  { label: "A", minPercent: 90, gradePoint: 4.0, isPassing: true },
  { label: "B", minPercent: 80, gradePoint: 3.0, isPassing: true },
  { label: "C", minPercent: 70, gradePoint: 2.0, isPassing: true },
  { label: "D", minPercent: 60, gradePoint: 1.0, isPassing: true },
];

function graded(obtained: number, total: number, label = "hw"): GradeItem {
  return { label, obtained, total, state: "graded" };
}

function absent(label = "exam"): GradeItem {
  return { label, obtained: 0, total: 100, state: "absent" };
}

function missing(label = "quiz"): GradeItem {
  return { label, obtained: 0, total: 100, state: "missing" };
}

describe("GRADE_CATEGORIES / DEFAULT_WEIGHTS", () => {
  it("exposes the six canonical categories", () => {
    expect(GRADE_CATEGORIES).toEqual([
      "homework",
      "unit_test",
      "midterm",
      "pre_board",
      "practical",
      "final",
    ]);
  });

  it("default weights sum to 100 (pre_board opted out at 0)", () => {
    const sum = GRADE_CATEGORIES.reduce(
      (acc, c) => acc + DEFAULT_WEIGHTS[c],
      0,
    );
    expect(sum).toBe(100);
    expect(DEFAULT_WEIGHTS.pre_board).toBe(0);
  });
});

describe("computeCategoryValue", () => {
  it("returns null for empty items", () => {
    expect(computeCategoryValue([])).toBeNull();
  });

  it("means graded item percentages", () => {
    // (80/100 + 90/150) / 2 = (80 + 60) / 2 = 70
    expect(computeCategoryValue([graded(80, 100), graded(90, 150)])).toBeCloseTo(
      70,
    );
  });
});

// ---------------------------------------------------------------------------
// The 9 required behaviors
// ---------------------------------------------------------------------------

describe("computeSubjectGrade — required behaviors", () => {
  it("1. empty inputs → finalPct null, coverage 0, no NaN anywhere", () => {
    const result = computeSubjectGrade([]);
    expect(result.finalPct).toBeNull();
    expect(result.coverage).toBe(0);
    expect(result.components).toEqual([]);
    expect(result.bandLabel).toBeNull();
    expect(result.gradePoint).toBeNull();
    expect(result.isPassing).toBeNull();
  });

  it("2. all-absent category → null value, excluded from final; absentCount tracked", () => {
    const result = computeSubjectGrade([
      { category: "homework", weightPct: 50, items: [absent(), absent()] },
      { category: "final", weightPct: 50, items: [graded(75, 100)] },
    ]);
    const hw = result.components[0];
    expect(hw.valuePct).toBeNull();
    expect(hw.itemCount).toBe(0);
    expect(hw.absentCount).toBe(2);

    // Renormalized: only `final` backs weight → its pct wins outright.
    expect(result.finalPct).toBe(75);
    expect(result.coverage).toBe(50);
  });

  it("3. single category weighting → final equals that category's mean", () => {
    const result = computeSubjectGrade(
      [
        {
          category: "unit_test",
          weightPct: 100,
          items: [graded(85, 100), graded(95, 100)],
        },
      ],
      LETTER_BANDS,
    );
    expect(result.finalPct).toBe(90);
    expect(result.coverage).toBe(100);
    expect(result.bandLabel).toBe("A"); // with bands provided
  });

  it("4. renormalization: homework present but final missing → weights rescale", () => {
    // homework 20%, practical 10%, final 30% configured; only homework has data.
    const result = computeSubjectGrade([
      { category: "homework", weightPct: 20, items: [graded(80, 100)] },
      { category: "practical", weightPct: 10, items: [missing()] },
      { category: "final", weightPct: 30, items: [] },
    ]);
    expect(result.finalPct).toBe(80); // 80*20 / 20 — rescaled to full
    expect(result.coverage).toBe(20);
  });

  it("5. boundary: 89.996 rounds to 90.00 and crosses the A band at minPercent 90", () => {
    // 4449.8 / 5000 * 100 = 89.996 exactly representable enough to round to 90.
    const inputs: CategoryInput[] = [
      {
        category: "homework",
        weightPct: 100,
        items: [graded(89.996, 100)],
      },
    ];
    expect(round2(computeCategoryValue(inputs[0].items) as number)).toBe(90);

    const result = computeSubjectGrade(inputs, LETTER_BANDS);
    // Raw finalPct < 90 but rounding happens BEFORE band lookup.
    expect(result.finalPct).toBe(90);
    expect(result.bandLabel).toBe("A");
    expect(result.gradePoint).toBe(4.0);
    expect(result.isPassing).toBe(true);
  });

  it("5b. just under boundary after rounding stays in lower band", () => {
    // 89.994 rounds to 89.99 → B.
    const result = computeSubjectGrade(
      [{ category: "final", weightPct: 100, items: [graded(89.994, 100)] }],
      LETTER_BANDS,
    );
    expect(result.finalPct).toBe(89.99);
    expect(result.bandLabel).toBe("B");
  });

  it("6. state 'graded' counts regardless of any lateness semantics", () => {
    // Late-submitted work arrives as status "graded" upstream — it must be
    // included identically to on-time work.
    const result = computeSubjectGrade([
      {
        category: "homework",
        weightPct: 100,
        items: [
          { label: "late-hw", obtained: 50, total: 100, state: "graded" },
          { label: "on-time", obtained: 70, total: 100, state: "graded" },
        ],
      },
    ]);
    expect(result.finalPct).toBe(60);
    expect(result.components[0].itemCount).toBe(2);
  });

  it("7. zero-total item skipped entirely — no NaN leaks", () => {
    const result = computeSubjectGrade([
      {
        category: "midterm",
        weightPct: 100,
        items: [
          { label: "bad", obtained: 10, total: 0, state: "graded" },
          graded(80, 100),
        ],
      },
    ]);
    expect(Number.isNaN(result.finalPct)).toBe(false);
    expect(result.finalPct).toBe(80);
    // Zero-total graded item is not counted in itemCount either.
    expect(result.components[0].itemCount).toBe(1);
  });

  it("8. weights summing ≠ 100 still works via renormalization; coverage reflects configured share", () => {
    // Configured weights total 40, not 100.
    const result = computeSubjectGrade([
      { category: "homework", weightPct: 30, items: [graded(60, 100)] },
      { category: "practical", weightPct: 10, items: [graded(100, 100)] },
    ]);
    // (60*30 + 100*10) / 40 = 2800/40 = 70
    expect(result.finalPct).toBe(70);
    expect(result.coverage).toBe(40);
  });

  it("9. below lowest band → failing fallback F band", () => {
    const result = computeSubjectGrade(
      [{ category: "final", weightPct: 100, items: [graded(12, 100)] }],
      LETTER_BANDS,
    );
    expect(result.bandLabel).toBe("F");
    expect(result.gradePoint).toBe(0);
    expect(result.isPassing).toBe(false);
    expect(result.finalPct).toBe(12);
  });
});

describe("edge cases", () => {
  it("zero-weight category with data does NOT count toward coverage or final", () => {
    const result = computeSubjectGrade([
      { category: "pre_board", weightPct: 0, items: [graded(0, 100)] },
      { category: "final", weightPct: 100, items: [graded(88, 100)] },
    ]);
    expect(result.finalPct).toBe(88);
    expect(result.coverage).toBe(100);
  });

  it("all categories zero-weight → final null, no division-by-zero NaN", () => {
    const result = computeSubjectGrade([
      { category: "final", weightPct: 0, items: [graded(50, 100)] },
    ]);
    expect(result.finalPct).toBeNull();
    expect(result.coverage).toBe(0);
    expect(Number.isNaN(result.coverage)).toBe(false);
  });

  it("no bands provided → band fields stay null even for high scores", () => {
    const result = computeSubjectGrade(
      [{ category: "final", weightPct: 100, items: [graded(97, 100)] }],
      undefined,
    );
    expect(result.finalPct).toBe(97);
    expect(result.bandLabel).toBeNull();
    expect(result.isPassing).toBeNull();
  });

  it("resolveBand returns null without bands or null pct", () => {
    expect(resolveBand(null, LETTER_BANDS)).toBeNull();
    expect(resolveBand(95, undefined)).toBeNull();
    expect(resolveBand(95, [])).toBeNull();
  });

  it("bands are unsorted input-safe (sorted desc internally)", () => {
    const shuffled: GradeBand[] = [...LETTER_BANDS].reverse();
    expect(resolveBand(85, shuffled)?.label).toBe("B");
    expect(resolveBand(59.9, shuffled)?.label).toBe("F");
  });

  it("mixed states: missing excluded from all counts, absent only flagged", () => {
    const stats = computeCategoryStats([
      graded(90, 100),
      absent(),
      missing(),
      absent(),
    ]);
    expect(stats.valuePct).toBe(90);
    expect(stats.itemCount).toBe(1);
    expect(stats.absentCount).toBe(2);
  });
});
