import { getCurrentUser } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv/stringify";
import { STUDENT_CSV_COLUMNS } from "@/features/students/validation/import-students";

export const runtime = "nodejs";

const TEMPLATE_ROWS: Record<string, string>[] = [
  {
    name: "Doe, John",
    email: "john.doe@example.edu",
    rollNumber: "BCA-23001",
    faculty: "BCA",
    semester: "1",
    section: "A",
    batchYear: "2026",
    phone: "9841000000",
    subjectCodes: "CS101,CS102",
  },
];

/**
 * GET /api/admin/import/template/students
 * Downloadable CSV template (BOM + header + one example row) for the
 * student bulk importer. Admin-only.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const csv = toCsv(TEMPLATE_ROWS, [...STUDENT_CSV_COLUMNS]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="students-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
