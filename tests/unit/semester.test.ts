import { describe, it, expect } from "vitest";
import {
  toSemesterNumber,
  toSemesterRoman,
  toSemesterOrdinal,
  zSemester,
} from "../../src/lib/semester";

describe("src/lib/semester.ts", () => {
  it("converts Roman numerals to numbers", () => {
    expect(toSemesterNumber("I")).toBe(1);
    expect(toSemesterNumber("ii")).toBe(2);
    expect(toSemesterNumber("III")).toBe(3);
    expect(toSemesterNumber("IV")).toBe(4);
    expect(toSemesterNumber("VIII")).toBe(8);
  });

  it("converts composite Roman numeral strings", () => {
    expect(toSemesterNumber("Semester IV")).toBe(4);
    expect(toSemesterNumber("Sem-II")).toBe(2);
    expect(toSemesterNumber("Sem VI")).toBe(6);
  });

  it("converts ordinal and numeric strings", () => {
    expect(toSemesterNumber("1st Semester")).toBe(1);
    expect(toSemesterNumber("2nd Semester")).toBe(2);
    expect(toSemesterNumber("3")).toBe(3);
    expect(toSemesterNumber(4)).toBe(4);
  });

  it("handles fallback and clamping", () => {
    expect(toSemesterNumber(null)).toBe(1);
    expect(toSemesterNumber(undefined)).toBe(1);
    expect(toSemesterNumber("invalid")).toBe(1);
    expect(toSemesterNumber(10)).toBe(8);
    expect(toSemesterNumber("10")).toBe(8);
    expect(toSemesterNumber("0")).toBe(1);
    expect(toSemesterNumber(-1)).toBe(1);
  });

  it("formats numbers to Roman numerals", () => {
    expect(toSemesterRoman(1)).toBe("I");
    expect(toSemesterRoman(2)).toBe("II");
    expect(toSemesterRoman(8)).toBe("VIII");
  });

  it("formats numbers to ordinals", () => {
    expect(toSemesterOrdinal(1)).toBe("1st Semester");
    expect(toSemesterOrdinal(2)).toBe("2nd Semester");
    expect(toSemesterOrdinal(3)).toBe("3rd Semester");
    expect(toSemesterOrdinal(4)).toBe("4th Semester");
  });

  it("validates using Zod schema", () => {
    expect(zSemester.parse("2")).toBe(2);
    expect(zSemester.parse(3)).toBe(3);
    expect(() => zSemester.parse(0)).toThrow();
    expect(() => zSemester.parse(9)).toThrow();
  });
});
