import { toSemesterNumber } from "@/lib/semester";

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

const ROMAN_TO_INT: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

const WORD_TO_INT: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
};

export function getOrdinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

/**
 * Robustly parses any semester representation (number, Roman numeral, ordinal, prefix string, or word)
 * into a valid semester integer (1 through 8), or returns null if unrecognized.
 *
 * Supported examples:
 * - 2, "2", "2.0" -> 2
 * - "II", "ii" -> 2
 * - "2nd", "2nd Semester", "2nd Sem" -> 2
 * - "BCA II", "BCA 2", "BCA-II", "CSIT II" -> 2
 * - "Semester II", "Sem 2", "Semester 2" -> 2
 * - "second", "second sem", "second semester", "bca second sem" -> 2
 * - "2nd Semesternd Semester", "NaNth Semester" (recovers corrupted strings) -> 2
 */
export function parseSemesterNumber(input: number | string | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    if (isNaN(input) || !isFinite(input)) return null;
    const clamped = Math.floor(input);
    return clamped >= 1 && clamped <= 8 ? clamped : null;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // Direct Roman match (case-insensitive)
  const upper = raw.toUpperCase();
  if (upper in ROMAN_TO_INT) {
    return ROMAN_TO_INT[upper];
  }

  // Direct word match (case-insensitive)
  const lower = raw.toLowerCase();
  if (lower in WORD_TO_INT) {
    return WORD_TO_INT[lower];
  }

  // 1. Try to match ordinal words anywhere in string (e.g. "second sem", "bca second semester")
  for (const [word, val] of Object.entries(WORD_TO_INT)) {
    const wordRegex = new RegExp(`\\b${word}\\b`, "i");
    if (wordRegex.test(lower)) {
      return val;
    }
  }

  // 2. Try to match standalone Roman numerals in descending length order
  // Descending order prevents "II" matching "I", "VIII" matching "VII" or "V", etc.
  const romanDesc = ["VIII", "VII", "III", "VI", "IV", "II", "V", "I"];
  for (const r of romanDesc) {
    const rRegex = new RegExp(`(?:^|[^a-zA-Z])${r}(?:$|[^a-zA-Z])`, "i");
    if (rRegex.test(upper)) {
      return ROMAN_TO_INT[r];
    }
  }

  // 3. Try to extract digits (1 through 8), handling ordinals like 2nd, 3rd, 4th
  const digitMatch = raw.match(/\b([1-8])(?:st|nd|rd|th)?\b/i) || raw.match(/([1-8])/);
  if (digitMatch) {
    const parsed = parseInt(digitMatch[1], 10);
    if (parsed >= 1 && parsed <= 8) {
      return parsed;
    }
  }

  return null;
}

/**
 * Convert a semester number or semester string representation to a Roman numeral (e.g. 2 -> "II", "2nd Semester" -> "II", "BCA II" -> "II", "second sem" -> "II").
 */
export function toRoman(semester: number | string | null | undefined): string {
  const parsed = parseSemesterNumber(semester);
  if (parsed !== null) {
    return ROMAN_NUMERALS[parsed - 1];
  }

  if (!semester) return "I";
  return String(semester).trim();
}

/**
 * Parse a Roman numeral string or semester representation into its integer semester representation (e.g. "II" -> 2, "BCA II" -> 2, "second sem" -> 2).
 */
export function fromRoman(roman: string | number | null | undefined): number {
  const parsed = parseSemesterNumber(roman);
  return parsed ?? 1;
}

/**
 * Convert a semester (number, Roman numeral, or string) to ordinal semester string (e.g. 2 -> "2nd Semester", "II" -> "2nd Semester", "BCA II" -> "2nd Semester").
 */
export function toOrdinalSemester(semester: number | string | null | undefined): string {
  const parsed = parseSemesterNumber(semester);
  if (parsed !== null) {
    return `${parsed}${getOrdinalSuffix(parsed)} Semester`;
  }

  if (semester === null || semester === undefined) return "1st Semester";
  return String(semester).trim();
}

/**
 * Generate all recognized database representation variants for a given semester.
 * E.g., for "II", 2, "BCA II", or "second sem": returns
 * ["II", "ii", "2nd Semester", "2nd", "2", "Semester II", "Semester 2", "Sem II", "Sem 2", "Sem 2nd", "BCA II", "BCA 2", "BCA 2nd Semester", "second", "second sem", "second semester"].
 */
export function getSemesterVariants(semester: number | string | null | undefined): string[] {
  if (semester === null || semester === undefined) return [];

  const variants = new Set<string>();
  const rawStr = String(semester).trim();
  if (rawStr) {
    variants.add(rawStr);
  }

  const intVal = parseSemesterNumber(semester);

  if (intVal !== null) {
    const roman = ROMAN_NUMERALS[intVal - 1];
    const romanLower = roman.toLowerCase();
    const suffix = getOrdinalSuffix(intVal);
    const ordinalFull = `${intVal}${suffix} Semester`;
    const ordinalShort = `${intVal}${suffix}`;
    const digitStr = String(intVal);

    variants.add(roman);
    variants.add(romanLower);
    variants.add(ordinalFull);
    variants.add(ordinalShort);
    variants.add(digitStr);
    variants.add(`Semester ${roman}`);
    variants.add(`Semester ${digitStr}`);
    variants.add(`Sem ${roman}`);
    variants.add(`Sem ${digitStr}`);
    variants.add(`Sem ${ordinalShort}`);
    variants.add(`BCA ${roman}`);
    variants.add(`BCA ${digitStr}`);
    variants.add(`BCA ${ordinalFull}`);

    // Add word forms
    const word = Object.keys(WORD_TO_INT).find((k) => WORD_TO_INT[k] === intVal);
    if (word) {
      variants.add(word);
      variants.add(`${word} sem`);
      variants.add(`${word} semester`);
      variants.add(`bca ${word} sem`);
      variants.add(`bca ${word} semester`);
    }
  }

  return Array.from(variants);
}

/**
 * Check if two semester representations refer to the same semester.
 * Compares canonical parsed semester numbers (1..8) or falls back to trimmed string matching.
 */
export function areSemestersEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return toSemesterNumber(a) === toSemesterNumber(b);
}
