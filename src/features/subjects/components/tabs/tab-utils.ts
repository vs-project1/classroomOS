import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Presentation,
  Link2,
  FileArchive,
  Code,
} from "lucide-react";

export const FILE_TYPE_STYLES: Record<
  string,
  { icon: LucideIcon; tint: string }
> = {
  pdf: {
    icon: FileText,
    tint: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  slides: {
    icon: Presentation,
    tint: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  link: {
    icon: Link2,
    tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  zip: {
    icon: FileArchive,
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  code: {
    icon: Code,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  doc: {
    icon: FileText,
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
};

export function fileTypeStyle(fileType: string) {
  return (
    FILE_TYPE_STYLES[fileType.trim().toLowerCase()] ?? {
      icon: FileText,
      tint: "bg-primary/10 text-primary border-primary/20",
    }
  );
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Document";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
