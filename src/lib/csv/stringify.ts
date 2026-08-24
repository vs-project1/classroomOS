import { stringify } from "csv-stringify/sync";

/**
 * Formula-injection guard (OWASP CSV Injection).
 * Prefixes a single quote to any cell beginning with `=`, `+`, `-`, `@` so
 * spreadsheet applications treat the content as text, not a formula.
 */
export function csvEscapeCell(value: unknown): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  if (/^[=+@-]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

/**
 * Serialize rows to an Excel-friendly CSV string:
 * - UTF-8 BOM prepended (Excel auto-detects encoding)
 * - Every cell quoted
 * - CRLF (`\r\n`) record delimiter
 *
 * @param rows    Array of plain objects (keys become the header row).
 * @param columns Optional explicit column order; defaults to the union of
 *                keys across all rows, in first-seen order.
 */
export function toCsv(
  rows: Record<string, unknown>[],
  columns?: string[],
): string {
  const cols =
    columns ?? Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const guarded = rows.map((row) =>
    Object.fromEntries(
      cols.map((col) => [col, csvEscapeCell(row[col] ?? "")]),
    ),
  );

  return stringify(guarded, {
    header: true,
    columns: cols,
    bom: true,
    quoted: true,
    record_delimiter: "\r\n",
  });
}
