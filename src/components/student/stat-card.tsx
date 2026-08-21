import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  title,
  value,
  icon,
  description,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card flex flex-col p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between pb-4">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className={cn("text-3xl font-semibold tracking-tight text-foreground", valueClassName)}>{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-2 font-medium">{description}</p>
      )}
    </div>
  );
}
