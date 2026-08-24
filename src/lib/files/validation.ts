/**
 * Pure file validation — no DB, no side effects.
 * Allowlist: pdf / docx / pptx / mp4 / zip / text
 * Limits: 25MB for docs, 100MB for video
 */

const MAX_DOC_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_MIMES = new Set<string>([
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
 * Derive canonical file type from file name / mime.
 * Returns one of: pdf | docx | pptx | mp4 | zip | text | unknown
 */
export function fileType(input: { name: string; mime?: string }): string {
  const mime = input.mime?.toLowerCase().trim();
  if (mime) {
    if (mime === "application/pdf") return "pdf";
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
    if (mime === "video/mp4") return "mp4";
    if (mime === "application/zip" || mime === "application/x-zip-compressed") return "zip";
    if (mime === "text/plain") return "text";
  }

  const ext = input.name.split(".").pop()?.toLowerCase().trim() ?? "";
  if (ALLOWED_EXTENSIONS.has(ext)) {
    if (ext === "txt") return "text";
    return ext;
  }
  return "unknown";
}

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

/**
 * Magic-bytes sniff — verifies that the header bytes match the claimed mime.
 * Returns true if magic matches, false otherwise.
 *
 * Detected signatures:
 * - pdf: %PDF  25 50 44 46
 * - zip/docx/pptx: PK 03 04 / PK 05 06 / PK 07 08  (50 4B 03 04 etc.)
 * - mp4: ftyp at offset 4 (66 74 79 70)
 * - text/plain: always true (no reliable magic)
 */
export function sniffMagic(bytes: Uint8Array, mime: string): boolean {
  const m = mime.toLowerCase().trim();

  if (m === "text/plain") {
    return true;
  }

  if (!bytes || bytes.length < 4) {
    return false;
  }

  // PDF: %PDF
  if (m === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  // ZIP-family: docx, pptx, zip — all start with PK
  if (
    m === "application/zip" ||
    m === "application/x-zip-compressed" ||
    m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    m === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    // Check PK header: 50 4B 03 04 or 50 4B 05 06 or 50 4B 07 08
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
    const third = bytes[2];
    const fourth = bytes[3];
    // ZIP local file header / empty archive / spanned
    const isZipMagic =
      (third === 0x03 && fourth === 0x04) ||
      (third === 0x05 && fourth === 0x06) ||
      (third === 0x07 && fourth === 0x08);
    return isZipMagic;
  }

  // MP4: ftyp at bytes 4-7
  if (m === "video/mp4" || m.startsWith("video/")) {
    if (bytes.length < 8) return false;
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  }

  // Fallback: if mime is in allowlist but we have no specific magic, consider valid
  // (e.g., future types). Do strict check for known types already handled above.
  // For unknown mimes, fail closed.
  if (ALLOWED_MIMES.has(m)) {
    return true;
  }

  // Unknown mime — check if extension fallback would be needed; treat as false for safety
  return false;
}

export const FILE_LIMITS = {
  doc: MAX_DOC_BYTES,
  video: MAX_VIDEO_BYTES,
} as const;
