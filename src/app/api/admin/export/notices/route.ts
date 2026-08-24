import { desc } from "drizzle-orm";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { toCsv } from "@/lib/csv/stringify";
import {
  csvFileResponse,
  fmtDateTime,
  requireAdminForExport,
} from "../_lib";

export const runtime = "nodejs";

/**
 * GET /api/admin/export/notices
 * Admin-only CSV export of all notices.
 */
export async function GET() {
  const guard = await requireAdminForExport();
  if (guard instanceof Response) return guard;

  const rows = await db
    .select({
      title: notices.title,
      content: notices.content,
      expiresAt: notices.expiresAt,
      isPinned: notices.isPinned,
      attachments: notices.attachments,
      createdAt: notices.createdAt,
      updatedAt: notices.updatedAt,
    })
    .from(notices)
    .orderBy(desc(notices.createdAt));

  const csv = toCsv(
    rows.map((r) => ({
      title: r.title,
      content: r.content,
      expiresAt: fmtDateTime(r.expiresAt),
      isPinned: r.isPinned ? "true" : "false",
      attachments: (r.attachments ?? []).join(";"),
      createdAt: fmtDateTime(r.createdAt),
      updatedAt: fmtDateTime(r.updatedAt),
    })),
  );

  return csvFileResponse(csv, "notices");
}
