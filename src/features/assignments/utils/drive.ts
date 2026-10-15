/**
 * Google Drive & Google Workspace Submission Utilities
 * Classroom OS — Validates Google Drive URLs and formats preview links for embed iframes
 */

export type GoogleDriveSubmissionType = "file" | "doc" | "sheet" | "slide" | "folder";

export interface GoogleDriveValidationResult {
  isValid: boolean;
  error?: string;
  fileId?: string;
  type?: GoogleDriveSubmissionType;
}

/**
 * Validates whether a given URL is a valid Google Drive, Google Docs, Sheets, or Slides link.
 * Extracts the resource ID and categorizes the resource type.
 */
export function validateGoogleDriveUrl(url: string | null | undefined): GoogleDriveValidationResult {
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      isValid: false,
      error: "Please provide a valid Google Drive link.",
    };
  }

  const trimmed = url.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: "Malformed URL. Please check the link and try again.",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const validHosts = [
    "drive.google.com",
    "docs.google.com",
    "sheets.google.com",
    "slides.google.com",
  ];

  const isGoogleHost = validHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  if (!isGoogleHost) {
    return {
      isValid: false,
      error: "Only Google Drive, Docs, Sheets, or Slides links are accepted.",
    };
  }

  const path = parsed.pathname;

  // 1. Google Docs (/document/(?:u/:acc/)?d/:id/...)
  const docMatch = path.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i);
  if (docMatch?.[1]) {
    return { isValid: true, fileId: docMatch[1], type: "doc" };
  }

  // 2. Google Sheets (/spreadsheets/(?:u/:acc/)?d/:id/...)
  const sheetMatch = path.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i);
  if (sheetMatch?.[1]) {
    return { isValid: true, fileId: sheetMatch[1], type: "sheet" };
  }

  // 3. Google Slides (/presentation/(?:u/:acc/)?d/:id/...)
  const slideMatch = path.match(/\/presentation\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i);
  if (slideMatch?.[1]) {
    return { isValid: true, fileId: slideMatch[1], type: "slide" };
  }

  // 4. Google Drive Folder (/drive/(?:u/:acc/)?folders/:id/...)
  const folderMatch = path.match(/\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/i);
  if (folderMatch?.[1]) {
    return { isValid: true, fileId: folderMatch[1], type: "folder" };
  }

  // 5. Google Drive File (/file/(?:u/:acc/)?d/:id/...)
  const fileMatch = path.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch?.[1]) {
    return { isValid: true, fileId: fileMatch[1], type: "file" };
  }

  // 6. Google Drive Query Parameter format (open?id=:id or uc?id=:id)
  const idParam = parsed.searchParams.get("id");
  if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) {
    return { isValid: true, fileId: idParam, type: "file" };
  }

  return {
    isValid: false,
    error: "Could not identify a valid Google Drive file or document ID from the provided URL.",
  };
}

/**
 * Normalizes any Google Drive, Docs, Sheets, or Slides URL into an embeddable /preview URL
 * suitable for inline iframe display (Canvas LMS SpeedGrader pattern).
 */
export function toGoogleDrivePreviewUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";

  const check = validateGoogleDriveUrl(url);
  if (!check.isValid || !check.fileId) {
    return url;
  }

  switch (check.type) {
    case "doc":
      return `https://docs.google.com/document/d/${check.fileId}/preview`;
    case "sheet":
      return `https://docs.google.com/spreadsheets/d/${check.fileId}/preview`;
    case "slide":
      return `https://docs.google.com/presentation/d/${check.fileId}/preview`;
    case "folder":
      return `https://drive.google.com/embeddedfolderview?id=${check.fileId}#list`;
    case "file":
    default:
      return `https://drive.google.com/file/d/${check.fileId}/preview`;
  }
}

/**
 * Convenience helper to determine if a URL points to Google Drive / Workspace.
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  return validateGoogleDriveUrl(url).isValid;
}
