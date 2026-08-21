import { type Page } from "@playwright/test";

export interface MockUploadOptions {
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileKey?: string;
}

/**
 * Intercepts UploadThing API requests and mocks successful file storage responses.
 */
export async function mockUploadThing(
  page: Page,
  options: MockUploadOptions = {}
) {
  const {
    fileName = "submission-lab1.pdf",
    fileUrl = "https://utfs.io/f/mock-test-file-key-123.pdf",
    fileSize = 1024 * 250, // 250 KB
    fileKey = "mock-test-file-key-123",
  } = options;

  // Intercept the Next.js API route for UploadThing
  await page.route("**/api/uploadthing**", async (route) => {
    const request = route.request();

    // 1. Handle polling / config queries
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            slug: "assignmentSubmission",
            maxFileSize: "16MB",
            fileTypes: ["pdf", "image", "application/zip"],
          },
        ]),
      });
      return;
    }

    // 2. Handle upload initiation POST request
    if (request.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            data: {
              url: fileUrl,
              name: fileName,
              size: fileSize,
              key: fileKey,
            },
            fileUrl: fileUrl,
            name: fileName,
            size: fileSize,
            key: fileKey,
          },
        ]),
      });
      return;
    }

    await route.continue();
  });

  // Intercept any direct calls to utfs.io or uploadthing AWS S3 buckets
  await page.route("**uploadthing**", async (route) => {
    if (route.request().method() === "PUT" || route.request().method() === "POST") {
      await route.fulfill({ status: 200, body: "OK" });
    } else {
      await route.continue();
    }
  });
}

/**
 * Attaches a synthetic PDF file directly to any file input element on the page.
 */
export async function attachSyntheticFile(
  page: Page,
  inputSelector: string = "input[type='file']",
  fileName: string = "assignment.pdf"
) {
  const buffer = Buffer.from("%PDF-1.4 synthetic mock pdf content for Classroom OS E2E");
  await page.setInputFiles(inputSelector, {
    name: fileName,
    mimeType: "application/pdf",
    buffer,
  });
}
