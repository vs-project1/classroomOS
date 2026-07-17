export function parseAndNormalizeTime(timeStr: string): string | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();

  // 1. Check if it's already HH:mm (24h)
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Check if it's H:mm (24h without leading zero)
  if (/^\d{1}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(":");
    return `${h.padStart(2, '0')}:${m}`;
  }

  // 3. Check for AM/PM formats: e.g. "11:35 AM", "9:30 PM", "09:30 AM", "11:35AM", "11:35 am"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase();

    if (hour < 0 || hour > 12) return null;
    const minInt = parseInt(minute, 10);
    if (minInt < 0 || minInt > 59) return null;

    if (ampm === "PM" && hour < 12) {
      hour += 12;
    } else if (ampm === "AM" && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  return null;
}

export function formatTime12h(timeStr: string | null): string {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  if (isNaN(hour) || isNaN(min)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minFormatted = min < 10 ? `0${min}` : min;
  return `${hour12}:${minFormatted} ${ampm}`;
}
