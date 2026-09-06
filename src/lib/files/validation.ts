/**
 * Pure file validation — no DB, no side effects.
 * Allowlist: pdf / docx / pptx / mp4 / zip / text
 * Limits: 25MB for docs, 100MB for video
 */

const MAX_DOC_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const ALLOWED_MIMES = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4",
  "application/zip",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set<string>(["pdf", "docx", "pptx", "mp4", "zip", "txt", "text"]);

export type ValidateFileInput = {
  name: string;
  mime: string;
  size: number;
};

export type ValidateFileResult =
  | { ok: true }
  | { ok: false; reason: "type" | "size"; message: string };

/**
 * Validate file against allowlist and size limits.
 * - Checks mime allowlist OR extension fallback (.pdf/.docx/.pptx/.mp4/.zip/.txt)
 * - Applies 100MB limit for video/mp4, 25MB otherwise
 */
export function validateFile(f: ValidateFileInput): ValidateFileResult {
  const mime = f.mime.toLowerCase().trim();
  const ext = f.name.split(".").pop()?.toLowerCase().trim() ?? "";

  const mimeAllowed = ALLOWED_MIMES.has(mime);
  const extAllowed = ALLOWED_EXTENSIONS.has(ext);

  // Allow if either mime is in allowlist OR extension is known.
  // If mime is video/mp4-like, also check startsWith.
  const isVideoMime = mime.startsWith("video/");
  const typeOk = mimeAllowed || extAllowed;

  if (!typeOk) {
    return { ok: false, reason: "type", message: `File type not allowed: ${f.mime} (.${ext})` };
  }

  // Extra guard: if extension is not allowed at all, reject even if mime somehow passed?
  // Already handled by typeOk.

  const limit = isVideoMime || mime === "video/mp4" || ext === "mp4" ? MAX_VIDEO_BYTES : MAX_DOC_BYTES;

  if (f.size > limit) {
    const limitMb = limit / (1024 * 1024);
    return { ok: false, reason: "size", message: `File exceeds ${limitMb}MB limit` };
  }

  if (f.size <= 0) {
    return { ok: false, reason: "size", message: "File is empty" };
  }

  return { ok: true };
}
