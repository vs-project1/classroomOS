/**
 * Google Drive & Google Workspace URL Parser & Embed Helper
 * Classroom OS — Handles presentation slides and document preview embedding
 */

export type GoogleDriveUrlInfo = {
  isGoogleDrive: boolean;
  fileId: string | null;
  type: "presentation" | "document" | "spreadsheet" | "drive_file" | "unknown";
  embedUrl: string | null;
};

/**
 * Parses any Google Drive or Google Workspace URL and extracts file ID and embed URL.
 */
export function parseGoogleDriveUrl(url: string | null | undefined): GoogleDriveUrlInfo {
  if (!url || typeof url !== "string") {
    return { isGoogleDrive: false, fileId: null, type: "unknown", embedUrl: null };
  }

  const cleanUrl = url.trim();

  // 1. Google Slides (docs.google.com/presentation/d/FILE_ID/...)
  const slidesMatch = cleanUrl.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch?.[1]) {
    const fileId = slidesMatch[1];
    return {
      isGoogleDrive: true,
      fileId,
      type: "presentation",
      embedUrl: `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false`,
    };
  }

  // 2. Google Docs (docs.google.com/document/d/FILE_ID/...)
  const docMatch = cleanUrl.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch?.[1]) {
    const fileId = docMatch[1];
    return {
      isGoogleDrive: true,
      fileId,
      type: "document",
      embedUrl: `https://docs.google.com/document/d/${fileId}/preview`,
    };
  }

  // 3. Google Sheets (docs.google.com/spreadsheets/d/FILE_ID/...)
  const sheetMatch = cleanUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch?.[1]) {
    const fileId = sheetMatch[1];
    return {
      isGoogleDrive: true,
      fileId,
      type: "spreadsheet",
      embedUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
    };
  }

  // 4. Google Drive Generic File (drive.google.com/file/d/FILE_ID/...)
  const driveFileMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch?.[1]) {
    const fileId = driveFileMatch[1];
    return {
      isGoogleDrive: true,
      fileId,
      type: "drive_file",
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  // 5. Google Drive open/id parameter format (drive.google.com/open?id=FILE_ID or uc?id=FILE_ID)
  const openIdMatch = cleanUrl.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch?.[1]) {
    const fileId = openIdMatch[1];
    return {
      isGoogleDrive: true,
      fileId,
      type: "drive_file",
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    };
  }

  return { isGoogleDrive: false, fileId: null, type: "unknown", embedUrl: null };
}

/**
 * Simple boolean check if a URL is a valid Google Drive or Google Workspace link.
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  return parseGoogleDriveUrl(url).isGoogleDrive;
}
