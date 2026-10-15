import { z } from "zod";

export const ROMAN_SEMESTERS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
] as const;

export type RomanSemester = (typeof ROMAN_SEMESTERS)[number];

export function toSemesterNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 1;
  if (typeof val === "number") {
    if (isNaN(val)) return 1;
    return Math.min(Math.max(Math.round(val), 1), 8);
  }
  const clean = String(val).trim().toUpperCase();
  // 1. Direct Roman numeral match
  const romanIdx = ROMAN_SEMESTERS.indexOf(clean as any);
  if (romanIdx !== -1) return romanIdx + 1;

  // 2. Tokenized Roman numeral match (e.g. "SEMESTER IV", "SEM-II", "SEM II")
  const tokens = clean.split(/[\s\-_/.]+/);
  for (const token of tokens) {
    const idx = ROMAN_SEMESTERS.indexOf(token as any);
    if (idx !== -1) return idx + 1;
  }

  // 3. Numeric extraction with consistent clamping (e.g. "1st Semester", "3", "10")
  const num = parseInt(clean.replace(/[^0-9]/g, ""), 10);
  if (!isNaN(num)) return Math.min(Math.max(num, 1), 8);

  return 1;
}

export function toSemesterRoman(sem: number): string {
  const clamped = Math.min(Math.max(Math.round(sem || 1), 1), 8);
  return ROMAN_SEMESTERS[clamped - 1] ?? "I";
}

export function toSemesterOrdinal(sem: number): string {
  const s = Math.min(Math.max(Math.round(sem || 1), 1), 8);
  const suffix = s === 1 ? "st" : s === 2 ? "nd" : s === 3 ? "rd" : "th";
  return `${s}${suffix} Semester`;
}

export const zSemester = z.coerce
  .number()
  .int()
  .min(1, "Semester must be between 1 and 8")
  .max(8, "Semester must be between 1 and 8");
