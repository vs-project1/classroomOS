import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className={cn("overflow-hidden flex flex-col", className)}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-muted/20">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("p-4 flex-1", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
