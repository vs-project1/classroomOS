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

function getOrdinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

/**
 * Convert a semester number or semester string representation to a Roman numeral (e.g. 2 -> "II", "2nd Semester" -> "II").
 */
export function toRoman(semester: number | string): string {
  if (typeof semester === "number") {
    if (semester >= 1 && semester <= 8) {
      return ROMAN_NUMERALS[semester - 1];
    }
    return String(semester);
  }

  if (!semester) return "I";

  const clean = semester.trim();
  const upper = clean.toUpperCase();
  if (upper in ROMAN_TO_INT) {
    return upper;
  }

  const digitMatch = clean.match(/(\d+)/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    if (num >= 1 && num <= 8) {
      return ROMAN_NUMERALS[num - 1];
    }
  }

  return clean;
}

/**
 * Parse a Roman numeral string into its integer semester representation (e.g. "II" -> 2).
 */
export function fromRoman(roman: string): number {
  if (!roman) return 1;
  const upper = roman.trim().toUpperCase();
  return ROMAN_TO_INT[upper] || 1;
}

/**
 * Convert a semester (number, Roman numeral, or string) to ordinal semester string (e.g. 2 -> "2nd Semester", "II" -> "2nd Semester").
 */
export function toOrdinalSemester(semester: number | string | null | undefined): string {
  if (semester === null || semester === undefined) return "1st Semester";

  if (typeof semester === "number") {
    const clamped = Math.max(1, Math.min(8, Math.floor(semester)));
    return `${clamped}${getOrdinalSuffix(clamped)} Semester`;
  }

  const clean = semester.trim();
  const upper = clean.toUpperCase();
  if (upper in ROMAN_TO_INT) {
    const num = ROMAN_TO_INT[upper];
    return `${num}${getOrdinalSuffix(num)} Semester`;
  }

  const digitMatch = clean.match(/(\d+)/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    const clamped = Math.max(1, Math.min(8, num));
    return `${clamped}${getOrdinalSuffix(clamped)} Semester`;
  }

  return clean;
}

/**
 * Generate all recognized database representation variants for a given semester.
 * E.g., for "II", 2, or "2nd Semester": returns ["II", "2nd Semester", "2nd", "2", "Semester II", "Semester 2"].
 */
export function getSemesterVariants(semester: number | string | null | undefined): string[] {
  if (semester === null || semester === undefined) return [];

  const variants = new Set<string>();
  const rawStr = String(semester).trim();
  if (rawStr) {
    variants.add(rawStr);
  }

  let intVal: number | null = null;

  if (typeof semester === "number") {
    if (semester >= 1 && semester <= 8) intVal = Math.floor(semester);
  } else {
    const upper = rawStr.toUpperCase();
    if (upper in ROMAN_TO_INT) {
      intVal = ROMAN_TO_INT[upper];
    } else {
      const digitMatch = rawStr.match(/(\d+)/);
      if (digitMatch) {
        const parsed = parseInt(digitMatch[1], 10);
        if (parsed >= 1 && parsed <= 8) intVal = parsed;
      }
    }
  }

  if (intVal !== null) {
    const roman = ROMAN_NUMERALS[intVal - 1];
    const suffix = getOrdinalSuffix(intVal);
    const ordinalFull = `${intVal}${suffix} Semester`;
    const ordinalShort = `${intVal}${suffix}`;
    const digitStr = String(intVal);

    variants.add(roman);
    variants.add(ordinalFull);
    variants.add(ordinalShort);
    variants.add(digitStr);
    variants.add(`Semester ${roman}`);
    variants.add(`Semester ${digitStr}`);
    variants.add(`Sem ${roman}`);
    variants.add(`Sem ${ordinalShort}`);
  }

  return Array.from(variants);
}

/**
 * Check if two semester representations refer to the same semester.
 */
export function areSemestersEqual(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (a === b) return true;

  const aVariants = getSemesterVariants(a);
  const bStr = String(b).trim();
  if (aVariants.includes(bStr)) return true;

  const bVariants = getSemesterVariants(b);
  return aVariants.some((v) => bVariants.includes(v));
}

