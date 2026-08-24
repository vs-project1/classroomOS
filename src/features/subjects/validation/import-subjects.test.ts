import { describe, expect, it } from "vitest";
import {
  SubjectCsvRowSchema,
  dedupeSubjectRows,
  type NumberedSubjectRow,
} from "./import-subjects";

const RAW_VALID_ROW = {
  code: "  cs101 ",
  name: "Intro to Computing",
  teacherEmail: " Teacher@Example.EDU ",
};

function validRow(overrides: Partial<Record<string, unknown>> = {}) {
  return SubjectCsvRowSchema.parse({ ...RAW_VALID_ROW, ...overrides });
}

describe("SubjectCsvRowSchema", () => {
  it("accepts a valid row and normalizes code/email casing + whitespace", () => {
    const row = validRow();
    expect(row.code).toBe("CS101");
    expect(row.name).toBe("Intro to Computing");
    expect(row.teacherEmail).toBe("teacher@example.edu");
  });

  it("allows a blank teacherEmail (subject without an assigned teacher)", () => {
    const row = SubjectCsvRowSchema.parse({
      code: "CS101",
      name: "Intro to Computing",
      teacherEmail: "",
    });
    expect(row.teacherEmail).toBe("");
  });

  it("allows a missing teacherEmail column entirely", () => {
    const row = SubjectCsvRowSchema.parse({
      code: "CS101",
      name: "Intro to Computing",
    });
    expect(row.teacherEmail).toBeUndefined();
  });

  it("rejects an invalid teacherEmail", () => {
    const result = SubjectCsvRowSchema.safeParse({
      ...RAW_VALID_ROW,
      teacherEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing or blank code", () => {
    expect(
      SubjectCsvRowSchema.safeParse({ ...RAW_VALID_ROW, code: "" }).success,
    ).toBe(false);
    expect(
      SubjectCsvRowSchema.safeParse({ name: "X" }).success,
    ).toBe(false);
  });

  it("rejects a missing or blank name", () => {
    expect(
      SubjectCsvRowSchema.safeParse({ ...RAW_VALID_ROW, name: "   " }).success,
    ).toBe(false);
    expect(
      SubjectCsvRowSchema.safeParse({ code: "CS101" }).success,
    ).toBe(false);
  });
});

function numbered(
  rows: Array<Record<string, unknown>>,
): NumberedSubjectRow[] {
  return rows.map((data, i) => ({
    data: SubjectCsvRowSchema.parse(data),
    rowNumber: i + 2,
  }));
}

describe("dedupeSubjectRows", () => {
  it("treats case-variant repeats as duplicates, keeping first occurrence", () => {
    const { kept, errors } = dedupeSubjectRows(
      numbered([
        { code: "cs101", name: "First" },
        { code: "CS101", name: "Second" },
        { code: "ma201", name: "Math" },
      ]),
    );
    expect(kept.map((r) => r.data.name)).toEqual(["First", "Math"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      row: 3,
      field: "code",
      code: "DUPLICATE_CODE",
    });
  });

  it("reports duplicates as DUPLICATE_CODE with Excel-style row numbers", () => {
    const { kept, errors } = dedupeSubjectRows(
      numbered([
        { code: "CS101", name: "First" },
        { code: "CS101", name: "Dup" },
        { code: "CS101", name: "Dup2" },
      ]),
    );
    expect(kept).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({
      row: 3,
      field: "code",
      code: "DUPLICATE_CODE",
    });
    expect(errors[0].reason).toContain("first seen on row 2");
    expect(errors[1].row).toBe(4);
  });
});
