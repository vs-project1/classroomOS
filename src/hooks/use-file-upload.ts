"use client";

import * as React from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

export type FileLinking = {
  courseId?: string;
  chapterId?: string;
  noticeId?: string;
  submissionId?: string;
  checksum?: string;
};

export type UseFileUploadOptions = {
  /** UploadThing endpoint to use. Defaults to generalFile */
  endpoint?: keyof OurFileRouter;
};

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const endpoint = (options.endpoint ?? "generalFile") as keyof OurFileRouter;
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // useUploadThing requires a stable endpoint; we cast to any to support dynamic endpoint.
  const ut = (useUploadThing as unknown as (ep: string, opts?: unknown) => {
    startUpload: (files: File[], input?: unknown) => Promise<Array<{ key: string; url: string; name: string; size: number }> | undefined>;
    isUploading: boolean;
    routeConfig: unknown;
  })(endpoint as string, {
    onUploadProgress: (p: number) => setProgress(p),
    onUploadError: (e: Error) => setError(e.message ?? "Upload failed"),
  });

  const upload = React.useCallback(
    async (file: File, linking: FileLinking = {}) => {
      setError(null);
      setProgress(0);
      setIsUploading(true);
      try {
        // Direct UploadThing upload (presign is handled internally by UT).
        const res = await ut.startUpload([file]);
        if (!res || res.length === 0 || !res[0]) {
          throw new Error("Upload failed: no response from UploadThing");
        }
        const uploaded = res[0] as {
          key: string;
          url: string;
          name: string;
          size: number;
        };

        // Confirm step: persist metadata to files table and link.
        const confirmPayload = {
          utKey: uploaded.key,
          url: uploaded.url,
          name: uploaded.name ?? file.name,
          mime: file.type || "application/octet-stream",
          size: uploaded.size ?? file.size,
          checksum: linking.checksum,
          courseId: linking.courseId,
          chapterId: linking.chapterId,
          noticeId: linking.noticeId,
          submissionId: linking.submissionId,
        };

        const confirmRes = await fetch("/api/files/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(confirmPayload),
        });

        if (!confirmRes.ok) {
          const body = await confirmRes.json().catch(() => ({}));
          throw new Error(body.error ?? `Confirm failed: ${confirmRes.status}`);
        }

        const data = (await confirmRes.json()) as {
          ok: boolean;
          file: { id: string; utKey: string; url: string };
        };
        setProgress(100);
        return data.file;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        throw e;
      } finally {
        setIsUploading(false);
      }
    },
    [ut]
  );

  const reset = React.useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    progress,
    isUploading: isUploading || ut.isUploading,
    error,
    reset,
    routeConfig: ut.routeConfig,
  };
}
