import { asc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { toCsv } from "@/lib/csv/stringify";
import {
  csvFileResponse,
  fmtDate,
  requireAdminForExport,
} from "../_lib";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/events
 * Admin-only CSV export of the academic calendar.
 */
export async function GET() {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const rows = await db
    .select()
    .from(events)
    .orderBy(asc(events.eventDate));

  const csv = toCsv(
    rows.map((r) => ({
      title: r.title,
      description: r.description,
      eventDate: fmtDate(r.eventDate),
      startTime: r.startTime ?? "",
      endTime: r.endTime ?? "",
      eventType: r.eventType,
      location: r.location ?? "",
    })),
  );

  return csvFileResponse(csv, "events");
}
