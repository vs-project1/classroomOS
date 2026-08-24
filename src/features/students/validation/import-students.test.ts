import { describe, expect, it } from "vitest";
import {
  StudentCsvRowSchema,
  dedupeStudentRows,
  splitSubjectCodes,
  toImportRowError,
  type NumberedStudentRow,
} from "./import-students";
import type { ParseError } from "@/lib/csv/parse";

const RAW_VALID_ROW = {
  name: "Doe, John",
  email: "JOHN.Doe@Example.EDU",
  rollNumber: "  BCA-23001  ",
  faculty: "BCA",
  semester: "3",
  section: "",
  batchYear: "2026",
  phone: "9841000000",
  subjectCodes: "cs101, CS102, cs101",
};

function validRow(overrides: Partial<Record<string, unknown>> = {}) {
  return StudentCsvRowSchema.parse({ ...RAW_VALID_ROW, ...overrides });
}

describe("StudentCsvRowSchema", () => {
  it("accepts a valid row and normalizes email/roll/subject codes", () => {
    const row = validRow();
    expect(row.email).toBe("john.doe@example.edu");
    expect(row.rollNumber).toBe("BCA-23001");
    expect(row.semester).toBe(3);
    expect(row.batchYear).toBe(2026);
  });

  it("coerces numeric-looking strings for semester and batchYear", () => {
    const row = validRow();
    expect(typeof row.semester).toBe("number");
    expect(typeof row.batchYear).toBe("number");
  });

  it("rejects an invalid email", () => {
    const result = StudentCsvRowSchema.safeParse({
      ...RAW_VALID_ROW,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range semesters", () => {
    expect(
      StudentCsvRowSchema.safeParse({ ...RAW_VALID_ROW, semester: "9" })
        .success,
    ).toBe(false);
    expect(
      StudentCsvRowSchema.safeParse({ ...RAW_VALID_ROW, semester: "0" })
        .success,
    ).toBe(false);
  });

  it("rejects a missing required column (undefined)", () => {
    const result = StudentCsvRowSchema.safeParse({
      name: "X",
      rollnumber: "1",
      faculty: "F",
      semester: "1",
      batchyear: "2026",
      // email missing entirely
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const codes = result.error.issues.map((i) => i.code);
      expect(codes).toContain("invalid_type");
    }
  });
});

describe("splitSubjectCodes", () => {
  it("splits, trims, uppercases and de-duplicates", () => {
    expect(splitSubjectCodes("cs101, CS102 ,cs101")).toEqual([
      "CS101",
      "CS102",
    ]);
  });

  it("returns [] for empty or undefined input", () => {
    expect(splitSubjectCodes(undefined)).toEqual([]);
    expect(splitSubjectCodes("")).toEqual([]);
    expect(splitSubjectCodes(" , ,")).toEqual([]);
  });
});

describe("dedupeStudentRows", () => {
  const numbered = (rows: ReturnType<typeof validRow>[]): NumberedStudentRow[] =>
    rows.map((data, i) => ({ data, rowNumber: i + 2 }));

  it("keeps all unique rows", () => {
    const result = dedupeStudentRows(
      numbered([validRow(), validRow({ rollNumber: "B-2", email: "b@x.edu" })]),
    );
    expect(result.kept).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("flags a duplicate roll number with the correct row number", () => {
    const result = dedupeStudentRows(
      numbered([validRow(), validRow({ email: "other@x.edu" })]),
    );
    expect(result.kept).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(3);
    expect(result.errors[0]?.code).toBe("DUPLICATE_ROLL");
  });

  it("flags a duplicate email case-insensitively on rolls", () => {
    const result = dedupeStudentRows(
      numbered([
        validRow(),
        validRow({ rollNumber: "bca-23001", email: "zz@x.edu" }),
      ]),
    );
    expect(result.kept).toHaveLength(1);
    expect(result.errors[0]?.code).toBe("DUPLICATE_ROLL");
  });

  it("flags duplicate emails", () => {
    const result = dedupeStudentRows(
      numbered([
        validRow(),
        validRow({ rollNumber: "B-2" }), // same email as row 2
      ]),
    );
    expect(result.kept).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(3);
    expect(result.errors[0]?.code).toBe("DUPLICATE_EMAIL");
  });
});

describe("toImportRowError", () => {
  it("maps an email field failure to INVALID_EMAIL", () => {
    const e: ParseError = {
      row: 5,
      field: "email",
      code: "invalid_format",
      message: "Invalid email address format",
    };
    expect(toImportRowError(e)).toMatchObject({
      row: 5,
      code: "INVALID_EMAIL",
    });
  });

  it("maps a missing required column to MISSING_COLUMN", () => {
    const e: ParseError = {
      row: 3,
      field: "name",
      code: "invalid_type",
      message: "Invalid input: expected string, received undefined",
    };
    expect(toImportRowError(e)).toMatchObject({
      row: 3,
      code: "MISSING_COLUMN",
    });
  });

  it("falls back to INVALID_VALUE for other failures", () => {
    const e: ParseError = {
      row: 7,
      field: "semester",
      code: "too_big",
      message: "Semester must be between 1 and 8",
    };
    expect(toImportRowError(e)).toMatchObject({
      row: 7,
      code: "INVALID_VALUE",
    });
  });
});
