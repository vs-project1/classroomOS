import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { validateFile } from "@/lib/files/validation";
import { assertCanRead } from "@/lib/files/authz";
import { db } from "@/db";
import { files } from "@/db/schema";

const confirmSchema = z.object({
  utKey: z.string().min(1),
  url: z.string().url().optional(),
  // UploadThing url is usually provided; if missing we synthesize utfs.io fallback.
  name: z.string().min(1).optional(),
  checksum: z.string().optional(),
  mime: z.string().min(1),
  size: z.number().int().positive(),
  courseId: z.string().optional(),
  chapterId: z.string().optional(),
  noticeId: z.string().optional(),
  submissionId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { utKey, url, name, checksum, mime, size, courseId, chapterId, noticeId, submissionId } = parsed.data;

    // Server-side file validation (allowlist + size)
    const validation = validateFile({
      name: name ?? utKey,
      mime,
      size,
    });
    if (!validation.ok) {
      return Response.json({ error: validation.reason }, { status: 400 });
    }

    // Authz: if courseId provided, caller must have read access
    if (courseId) {
      try {
        await assertCanRead(courseId, user.id);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return Response.json({ error: message }, { status: 403 });
      }
    }

    // Synthesize URL if not supplied (UploadThing utfs.io convention)
    const fileUrl = url ?? `https://utfs.io/f/${utKey}`;

    const id = crypto.randomUUID();

    await db.insert(files).values({
      id,
      ownerId: user.id,
      utKey,
      url: fileUrl,
      mime,
      size,
      checksum: checksum ?? null,
      courseId: courseId ?? null,
      chapterId: chapterId ?? null,
      submissionId: submissionId ?? null,
      noticeId: noticeId ?? null,
      version: 1,
    });

    // Return inserted record
    return Response.json({ ok: true, file: { id, utKey, url: fileUrl, mime, size, courseId, chapterId, noticeId, submissionId } }, { status: 200 });
  } catch (err) {
    // NEXT_REDIRECT digests must be rethrown
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    // Never leak raw error.message to client
    console.error("[files/confirm] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
