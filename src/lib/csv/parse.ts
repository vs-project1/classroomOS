import { parse } from "csv-parse/sync";
import type { ZodType } from "zod";

/**
 * Row-level parse/validation error.
 * `row` uses Excel-style numbering: header row = 1, first data row = 2.
 */
export interface ParseError {
  /** Excel-style row number (header = 1, first data row = 2). 0 = whole-file/fatal. */
  row: number;
  /** Dot-joined zod issue path, when the error came from row validation. */
  field?: string;
  /** Machine-readable classification hint (e.g. zod issue code). */
  code?: string;
  message: string;
}

export interface ParseCsvOptions {
  /** Column delimiter. Defaults to "," (auto-handled quotes always apply). */
  delimiter?: string;
}

/**
 * Normalize a CSV header cell to a stable object key:
 * trim -> lowercase -> collapse whitespace/underscores/hyphens.
 * "Roll Number" / "roll_number" / "ROLL-NUMBER" all become "rollnumber".
 */
export function normalizeCsvHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export interface ParsedCsv<T> {
  data: T[];
  errors: ParseError[];
}

/**
 * Parse a CSV document into validated, typed rows.
 *
 * - Strips UTF-8 BOM (csv-parse `bom: true`)
 * - Handles quoted fields containing commas/newlines (`relax_quotes: true`)
 * - Handles CRLF and LF line endings
 * - Skips blank lines, trims cell whitespace
 * - Normalizes header names via {@link normalizeCsvHeader}
 * - Validates each row against `rowSchema`; invalid rows surface as
 *   row-level errors (with correct Excel-style row numbers) instead of failing
 *   the whole document.
 */
export function parseCsv<T>(
  text: string,
  rowSchema: ZodType<T>,
  opts: ParseCsvOptions = {},
): ParsedCsv<T> {
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_quotes: true,
      ...(opts.delimiter ? { delimiter: opts.delimiter } : {}),
    }) as Record<string, string>[];
  } catch (error) {
    // Malformed document-level structure (unbalanced quotes etc.) — surface as
    // a single fatal error rather than throwing into the caller.
    return {
      data: [],
      errors: [
        {
          row: 0,
          code: "PARSE_FATAL",
          message:
            error instanceof Error
              ? `CSV could not be parsed: ${error.message}`
              : "CSV could not be parsed.",
        },
      ],
    };
  }

  const data: T[] = [];
  const errors: ParseError[] = [];

  records.forEach((record, index) => {
    // Header occupies row 1; data starts at row 2.
    const rowNumber = index + 2;

    // Re-normalize keys defensively (csv-parse may deliver raw headers when
    // `columns: true` preserves them verbatim).
    const normalized = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        normalizeCsvHeader(key),
        value,
      ]),
    );

    const result = rowSchema.safeParse(normalized);
    if (result.success) {
      data.push(result.data);
      return;
    }

    for (const issue of result.error.issues) {
      errors.push({
        row: rowNumber,
        field: issue.path.length > 0 ? issue.path.map(String).join(".") : undefined,
        code: issue.code,
        message: issue.message,
      });
    }
  });

  return { data, errors };
}
