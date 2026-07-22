import { cn } from "@/lib/utils";

export type StatusType = 
  | "present" | "absent" | "late"
  | "completed" | "ongoing" | "upcoming"
  | "due_soon" | "not_started"
  | "important" | "high_priority";

interface StatusChipProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const styles: Record<StatusType, string> = {
    present: "bg-emerald-100 text-emerald-700 border-emerald-200",
    absent: "bg-red-100 text-red-700 border-red-200",
    late: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    ongoing: "bg-indigo-100 text-indigo-700 border-indigo-200",
    upcoming: "bg-slate-100 text-slate-700 border-slate-200",
    due_soon: "bg-amber-100 text-amber-700 border-amber-200",
    not_started: "bg-slate-100 text-slate-700 border-slate-200",
    important: "bg-blue-100 text-blue-700 border-blue-200",
    high_priority: "bg-amber-100 text-amber-700 border-amber-200",
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
    important: "Important",
    high_priority: "High Priority",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        styles[status],
        className
      )}
    >
      {label || defaultLabels[status]}
    </span>
  );
}
