import NepaliDate from 'nepali-datetime';

/**
 * Format a Date object or timestamp into a Nepali Date string.
 * @param date Date, string, or number to format
 * @param formatStr format string compatible with nepali-datetime
 * @returns Formatted Nepali date string
 */
export function formatNepaliDate(date: Date | string | number, formatStr: string = 'YYYY MMMM DD'): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new NepaliDate(d).format(formatStr);
}

/**
 * Format a Date object or timestamp into a Nepali Date & Time string.
 * @param date Date, string, or number to format
 * @returns Formatted Nepali date and time string (e.g., 2083 Bhadra 10, 11:15 AM)
 */
export function formatNepaliDateTime(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new NepaliDate(d).format('YYYY MMMM DD, hh:mm A');
}
