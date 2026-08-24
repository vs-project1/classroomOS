import { sql, type SQL } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { ordinalSemester } from "@/lib/csv/types";

/**
 * Shared plumbing for /api/admin/export/* route handlers.
 * Colocated under an underscore prefix so Next.js never treats it as a route.
 */

/** Admin guard mirroring the students template-route convention. */
export async function requireAdminForExport(): Promise<SessionUser | Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

/** Excel-friendly CSV attachment response (toCsv already prepends BOM). */
export function csvFileResponse(csv: string, entity: string): Response {
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entity}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export interface ExportFilters {
  faculty?: string;
  semester?: string;
}

/**
 * Optional ?faculty=&semester= searchParams. Callers pass these through to
 * queries only where a matching column exists; undefined = no filter.
 */
export function readExportFilters(req: Request): ExportFilters {
  const url = new URL(req.url);
  return {
    faculty: url.searchParams.get("faculty")?.trim() || undefined,
    semester: url.searchParams.get("semester")?.trim() || undefined,
  };
}

/**
 * Drizzle conditions for the optional faculty/semester filters against
 * student-table columns. `semester` accepts a number ("3" -> "3rd Semester",
 * matching how students.semester stores terms) or a verbatim label.
 * Pass the returned array through `and(...)` — empty array means no filter.
 */
export function studentFilterConditions(
  filters: ExportFilters,
  facultyCol?: AnySQLiteColumn,
  semesterCol?: AnySQLiteColumn,
): SQL[] {
  const conds: SQL[] = [];
  if (filters.faculty && facultyCol) {
    conds.push(sql`lower(${facultyCol}) = ${filters.faculty.toLowerCase()}`);
  }
  if (filters.semester && semesterCol) {
    const n = Number(filters.semester);
    const value =
      Number.isInteger(n) && n >= 1 && n <= 8 ? ordinalSemester(n) : filters.semester;
    conds.push(sql`lower(${semesterCol}) = ${value.toLowerCase()}`);
  }
  return conds;
}

/** ISO date (YYYY-MM-DD) for date-only cells; "" for null. */
export function fmtDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/** Full ISO timestamp for audit-style cells; "" for null. */
export function fmtDateTime(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}
