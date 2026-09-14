import * as React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 py-12 rounded-xl border border-dashed border-border/60 bg-muted/5 max-w-md mx-auto space-y-3",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mb-1 shrink-0 text-muted-foreground">
          {React.isValidElement(Icon)
            ? Icon
            : typeof Icon === "function"
              ? React.createElement(
                  Icon as React.ComponentType<{ className?: string }>,
                  {
                    className: "h-6 w-6 opacity-70",
                  }
                )
              : null}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-foreground tracking-tight">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
      {children}
    </div>
  )
}
