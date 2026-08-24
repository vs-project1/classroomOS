import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getCurrentUser } from "@/lib/auth/session";

const f = createUploadthing();

export const ourFileRouter = {
  // Course materials uploaded by Teachers / Admins (16MB)
  // Policy: pdf/image/text ONLY — no catch-all `blob`, which accepted
  // arbitrary binaries (.exe) and scriptable formats (.svg).
  courseMaterial: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    text: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
        throw new UploadThingError("Unauthorized: Only teachers and admins can upload course materials.");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url, name: file.name, size: file.size };
    }),

  // Student assignment submissions (16MB max, one file)
  assignmentSubmission: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    text: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user) {
        throw new UploadThingError("Unauthorized: Only authenticated students can upload assignment submissions.");
      }
      return { userId: user.id, studentProfileId: user.studentProfileId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.url,
        name: file.name,
        size: file.size,
        key: file.key,
      };
    }),

  // Notice attachments — Teachers/Admins only, pdf/image/text 16MB
  noticeAttachment: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    text: { maxFileSize: "16MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
        throw new UploadThingError("Unauthorized: Only teachers and admins can upload notice attachments.");
      }
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url, name: file.name, size: file.size, key: file.key };
    }),

  // General files — pdf/docx/pptx/mp4/zip 32MB, any authenticated user.
  // UploadThing types: pdf, image, video, text, blob. Blob covers docx/pptx/zip.
  generalFile: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 5 },
    image: { maxFileSize: "32MB", maxFileCount: 5 },
    video: { maxFileSize: "32MB", maxFileCount: 1 },
    text: { maxFileSize: "32MB", maxFileCount: 5 },
    blob: { maxFileSize: "32MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await getCurrentUser();
      if (!user) {
        throw new UploadThingError("Unauthorized: Authentication required to upload files.");
      }
      return { userId: user.id, role: user.role };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url, name: file.name, size: file.size, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
