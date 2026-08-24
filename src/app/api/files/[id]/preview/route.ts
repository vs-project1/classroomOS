import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { assertCanRead } from "@/lib/files/authz";
import { db } from "@/db";
import { files } from "@/db/schema";

type Params = { id: string };

export async function GET(
  _req: Request,
  ctx: { params: Params | Promise<Params> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await Promise.resolve(ctx.params);
    const id = params.id;
    if (!id) {
      return Response.json({ error: "Missing file id" }, { status: 400 });
    }

    const file = await db.query.files.findFirst({ where: eq(files.id, id) });
    if (!file) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    // Authz: if file is linked to a course, enforce course read
    if (file.courseId) {
      try {
        await assertCanRead(file.courseId, user.id);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Forbidden";
        return Response.json({ error: message }, { status: 403 });
      }
    } else {
      // No course link — allow owner, ADMIN, or any authenticated for now.
      // Could tighten later per notice/submission ownership.
      // For safety, allow any authenticated to preview non-course files.
    }

    // For now, files.url is the UploadThing URL; redirect 302.
    // Future: generate signed GET if stored in R2/S3 backend.
    return Response.redirect(file.url, 302);
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    console.error("[files/preview] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
