const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function toRoman(semester: number): string {
  if (semester < 1 || semester > 8) return String(semester);
  return ROMAN_NUMERALS[semester - 1];
}

