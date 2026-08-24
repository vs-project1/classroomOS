import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseCsv, normalizeCsvHeader } from "./parse";
import { csvEscapeCell, toCsv } from "./stringify";

const RowSchema = z.object({
  name: z.string().min(1),
  rollnumber: z.string().min(1),
});

describe("normalizeCsvHeader", () => {
  it.each([
    ["Roll Number", "rollnumber"],
    [" roll_number ", "rollnumber"],
    ["FULL-NAME", "fullname"],
    ["Email", "email"],
  ])("maps %s -> %s", (input, expected) => {
    expect(normalizeCsvHeader(input)).toBe(expected);
  });
});

describe("parseCsv", () => {
  it("strips a UTF-8 BOM before parsing", () => {
    const text = "\uFEFFname,rollnumber\nJohn,BCA-001";
    const { data, errors } = parseCsv(text, RowSchema);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "John", rollnumber: "BCA-001" }]);
  });

  it("handles quoted fields containing commas", () => {
    const text = 'name,rollnumber\n"Doe, John",BCA-002';
    const { data, errors } = parseCsv(text, RowSchema);
    expect(errors).toHaveLength(0);
    expect(data[0]?.name).toBe("Doe, John");
  });

  it("handles CRLF line endings", () => {
    const text = "name,rollnumber\r\nA,1\r\nB,2\r\n";
    const { data, errors } = parseCsv(text, RowSchema);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([
      { name: "A", rollnumber: "1" },
      { name: "B", rollnumber: "2" },
    ]);
  });

  it("supports an alternate delimiter (semicolon)", () => {
    const text = "name;rollnumber\nA;1";
    const { data, errors } = parseCsv(text, RowSchema, { delimiter: ";" });
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "A", rollnumber: "1" }]);
  });

  it("normalizes header variants onto schema keys", () => {
    const text = "Full Name,Roll Number\nJohn,7";
    const Schema = z.object({ fullname: z.string(), rollnumber: z.string() });
    const { data, errors } = parseCsv(text, Schema);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ fullname: "John", rollnumber: "7" }]);
  });

  it("reports a row-level error with the correct Excel-style row number on zod failure", () => {
    // header = row 1; first data row = 2 (valid); second data row = 3 (invalid)
    const text = "name,rollnumber\nGood,1\n,2";
    const { data, errors } = parseCsv(text, RowSchema);
    expect(data).toEqual([{ name: "Good", rollnumber: "1" }]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.row).toBe(3);
    expect(errors[0]?.field).toBe("name");
  });

  it("returns a fatal whole-file error for structurally broken CSV", () => {
    const text = 'name,rollnumber\n"unterminated,2';
    const { data, errors } = parseCsv(text, RowSchema);
    expect(data).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.row).toBe(0);
    expect(errors[0]?.code).toBe("PARSE_FATAL");
  });

  it("skips empty lines and trims cell whitespace", () => {
    const text = "name,rollnumber\n\n  A , 1 \n";
    const { data, errors } = parseCsv(text, RowSchema);
    expect(errors).toHaveLength(0);
    expect(data).toEqual([{ name: "A", rollnumber: "1" }]);
  });
});

describe("csvEscapeCell", () => {
  it.each([
    ["=SUM(A1)", "'=SUM(A1)"],
    ["+cmd", "'+cmd"],
    ["-221013", "'-221013"],
    ["@import", "'@import"],
    ["safe value", "safe value"],
  ])("guards %s", (input, expected) => {
    expect(csvEscapeCell(input)).toBe(expected);
  });
});

describe("toCsv", () => {
  it("prepends a UTF-8 BOM and uses CRLF record delimiters", () => {
    const out = toCsv([{ name: "A", roll: "1" }, { name: "B", roll: "2" }]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toContain("\r\n");
    expect(out.includes("\n") && !out.includes("\r\n")).toBe(false);
  });

  it("quotes every cell", () => {
    const out = toCsv([{ name: "A" }], ["name"]);
    expect(out).toContain('"name"');
    expect(out).toContain('"A"');
  });

  it("applies the formula-injection guard to dangerous cells", () => {
    const out = toCsv([{ cmd: "=HYPERLINK(\"http://evil\")" }]);
    expect(out).toContain("'=HYPERLINK");
  });

  it("respects explicit column order", () => {
    const out = toCsv(
      [{ b: "2", a: "1" }],
      ["a", "b"],
    );
    const headerLine = out.slice(1).split("\r\n")[0]; // skip BOM
    expect(headerLine).toBe('"a","b"');
  });
});
