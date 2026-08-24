import { describe, expect, it } from "vitest";
import {
  EnrollmentCsvRowSchema,
  dedupeEnrollmentRows,
  enrollmentRowKey,
  type NumberedEnrollmentRow,
} from "./import-enrollments";

const RAW_VALID_ROW = {
  rollNumber: " BCA-23001 ",
  subjectCode: " cs101 ",
  semester: "3",
};

function validRow(overrides: Partial<Record<string, unknown>> = {}) {
  return EnrollmentCsvRowSchema.parse({ ...RAW_VALID_ROW, ...overrides });
}

describe("EnrollmentCsvRowSchema", () => {
  it("accepts a valid row and normalizes roll/subject casing + whitespace", () => {
    const row = validRow();
    expect(row.rollNumber).toBe("BCA-23001");
    expect(row.subjectCode).toBe("CS101");
    expect(row.semester).toBe(3);
  });

  it("coerces numeric-looking semester strings", () => {
    expect(typeof validRow().semester).toBe("number");
  });

  it("rejects out-of-range semesters", () => {
    expect(
      EnrollmentCsvRowSchema.safeParse({ ...RAW_VALID_ROW, semester: "0" })
        .success,
    ).toBe(false);
    expect(
      EnrollmentCsvRowSchema.safeParse({ ...RAW_VALID_ROW, semester: "9" })
        .success,
    ).toBe(false);
    expect(
      EnrollmentCsvRowSchema.safeParse({ ...RAW_VALID_ROW, semester: "2.5" })
        .success,
    ).toBe(false);
  });

  it("rejects missing roll number or subject code", () => {
    expect(
      EnrollmentCsvRowSchema.safeParse({ subjectCode: "CS101", semester: "1" })
        .success,
    ).toBe(false);
    expect(
      EnrollmentCsvRowSchema.safeParse({ rollNumber: "R1", semester: "1" })
        .success,
    ).toBe(false);
  });
});

describe("enrollmentRowKey", () => {
  it("is case-insensitive for roll number and subject code", () => {
    expect(enrollmentRowKey(validRow())).toBe(
      enrollmentRowKey({
        rollNumber: "bca-23001",
        subjectCode: "CS101",
        semester: 3,
      }),
    );
  });

  it("distinguishes different semesters", () => {
    expect(enrollmentRowKey(validRow())).not.toBe(
      enrollmentRowKey({ ...validRow(), semester: 4 }),
    );
  });
});

function numbered(
  rows: Array<Record<string, unknown>>,
): NumberedEnrollmentRow[] {
  return rows.map((data, i) => ({
    data: EnrollmentCsvRowSchema.parse(data),
    rowNumber: i + 2,
  }));
}

describe("dedupeEnrollmentRows", () => {
  it("keeps distinct triples and treats case-variant repeats as duplicates", () => {
    const { kept, errors } = dedupeEnrollmentRows(
      numbered([
        RAW_VALID_ROW,
        { rollNumber: "BCA-23001", subjectCode: "CS101", semester: "3" },
        { rollNumber: "BCA-23002", subjectCode: "CS101", semester: "3" },
        { rollNumber: "BCA-23001", subjectCode: "MA201", semester: "3" },
      ]),
    );
    expect(kept).toHaveLength(3);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 3, code: "DUPLICATE_ROW" });
  });

  it("reports duplicates as DUPLICATE_ROW with Excel-style row numbers", () => {
    const { kept, errors } = dedupeEnrollmentRows(
      numbered([
        RAW_VALID_ROW,
        { rollNumber: "bca-23001", subjectCode: "cs101", semester: "3" },
        { rollNumber: "bca-23001", subjectCode: "cs101", semester: "3" },
      ]),
    );
    expect(kept).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({
      row: 3,
      field: "rollnumber",
      code: "DUPLICATE_ROW",
    });
    expect(errors[0].reason).toContain("first seen on row 2");
    expect(errors[1].row).toBe(4);
  });
});
