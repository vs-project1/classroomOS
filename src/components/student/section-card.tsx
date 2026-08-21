import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card flex flex-col overflow-hidden shadow-sm", className)}>
      {(title || description || action) && (
        <div className="flex flex-row items-center justify-between p-5 pb-4 border-b border-border/20">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium tracking-tight flex items-center gap-2 text-foreground">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              {title}
            </h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn("p-5 flex-1", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
