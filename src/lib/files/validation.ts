/**
 * Pure validation for file uploads — no DB access.
 * Allowlist + size + magic-bytes sniff.
 */

// Allowlist covers the routers we expose via UploadThing.
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "txt",
  "md",
  "csv",
  "docx",
  "pptx",
  "mp4",
  "zip",
]);

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4",
  "application/zip",
  "application/x-zip-compressed",
]);

const MAX_SIZE_GENERAL = 32 * 1024 * 1024; // 32MB
const MAX_SIZE_NOTICE = 16 * 1024 * 1024; // 16MB (pdf/image/text)

// For sniffing — check first bytes.
export function sniffMagic(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 4) return true; // too small to sniff, defer to mime check
  // PDF %PDF
  if (mime === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  // ZIP PK\x03\x04 or PK\x05\x06 etc
  if (mime === "application/zip" || mime === "application/x-zip-compressed") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }
  // PNG 89 50 4E 47
  if (mime === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  // JPEG FF D8 FF
  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  // MP4 ftyp
  if (mime === "video/mp4") {
    // bytes 4..7 == 'ftyp'
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  }
  return true; // unknown mime, skip sniff
}

export type ValidateFileInput = {
  name: string;
  mime: string;
  size: number;
};

export type ValidateResult = { ok: true } | { ok: false; reason: string };

export function getExtension(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1]!.toLowerCase();
}

export function validateFile(input: ValidateFileInput): ValidateResult {
  const ext = getExtension(input.name);
  const mimeOk = ALLOWED_MIMES.has(input.mime);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  // Allow if either mime or extension is on allowlist (covers blob uploads).
  if (!mimeOk && !extOk) {
    return { ok: false, reason: `File type not allowed: ${input.mime} (.${ext})` };
  }

  // Size limits: general 32MB, notice-style (pdf/image/text) also allowed at 16MB within general.
  // We enforce 32MB ceiling here; router config already limits per-endpoint.
  // For strict notice limit, caller can pass smaller max if needed.
  if (input.size > MAX_SIZE_GENERAL) {
    return { ok: false, reason: `File too large: ${input.size} bytes exceeds ${MAX_SIZE_GENERAL} limit` };
  }

  // Explicit block for dangerous executables even if mime spoofed via blob.
  if (ext === "exe" || ext === "sh" || ext === "bat" || ext === "js") {
    return { ok: false, reason: `Executable file type not allowed: .${ext}` };
  }

  return { ok: true };
}

/**
 * Validate with router-aware size limit.
 */
export function validateFileForRouter(
  input: ValidateFileInput,
  router: "noticeAttachment" | "generalFile" | "courseMaterial" | "assignmentSubmission"
): ValidateResult {
  const result = validateFile(input);
  if (!result.ok) return result;
  const limit = router === "generalFile" ? MAX_SIZE_GENERAL : MAX_SIZE_NOTICE;
  if (input.size > limit) {
    return { ok: false, reason: `File too large for ${router}: ${input.size} > ${limit}` };
  }
  // noticeAttachment / courseMaterial only allow pdf/image/text
  if (router === "noticeAttachment" || router === "courseMaterial") {
    const allowedForNotice = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "text/plain",
      "text/markdown",
      "text/csv",
    ]);
    const extAllowed = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "svg", "txt", "md", "csv"].includes(
      getExtension(input.name)
    );
    if (!allowedForNotice.has(input.mime) && !extAllowed) {
      return { ok: false, reason: `noticeAttachment only allows pdf/image/text` };
    }
  }
  return { ok: true };
}
