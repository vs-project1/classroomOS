import { cn } from "@/lib/utils";

export type StatusType = 
  | "present" | "absent" | "late"
  | "completed" | "ongoing" | "upcoming"
  | "due_soon" | "not_started" | "overdue"
  | "important" | "high_priority";

interface StatusChipProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const styles: Record<StatusType, string> = {
    present: "text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/70 dark:border-emerald-800",
    absent: "text-red-800 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-950/70 dark:border-red-800",
    late: "text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-950/70 dark:border-amber-800",
    completed: "text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/70 dark:border-emerald-800",
    ongoing: "text-indigo-800 bg-indigo-100 border-indigo-300 dark:text-indigo-300 dark:bg-indigo-950/70 dark:border-indigo-800",
    upcoming: "text-slate-800 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-800/80 dark:border-slate-700",
    due_soon: "text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-950/70 dark:border-amber-800",
    not_started: "text-slate-800 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-800/80 dark:border-slate-700",
    overdue: "text-red-800 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-950/70 dark:border-red-800",
    important: "text-blue-800 bg-blue-100 border-blue-300 dark:text-blue-300 dark:bg-blue-950/70 dark:border-blue-800",
    high_priority: "text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-950/70 dark:border-amber-800",
  };

  const defaultLabels: Record<StatusType, string> = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    completed: "Completed",
    ongoing: "In Progress",
    upcoming: "Upcoming",
    due_soon: "Due Soon",
    not_started: "Not Started",
    overdue: "Overdue",
    important: "Important",
    high_priority: "High Priority",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase border",
        styles[status],
        className
      )}
    >
      {label || defaultLabels[status]}
    </span>
  );
}
