import { cn } from "@/lib/utils";

interface AttendanceGaugeProps {
  percentage: number;
  /** Class for the progress stroke, e.g. "stroke-teal-500" or "stroke-primary" */
  strokeClassName?: string;
  /** Renders a tick marker on the ring at this percentage (e.g. 80 for the TU requirement) */
  threshold?: number;
  thresholdClassName?: string;
  /** Rendered centered inside the ring */
  children?: React.ReactNode;
  className?: string;
}

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AttendanceGauge({
  percentage,
  strokeClassName = "stroke-primary",
  threshold,
  thresholdClassName = "stroke-foreground/20",
  children,
  className,
}: AttendanceGaugeProps) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * clamped) / 100;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={RADIUS} className="stroke-muted fill-none stroke-[10]" />
        {typeof threshold === "number" && (
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            className={cn("fill-none stroke-[12]", thresholdClassName)}
            strokeDasharray={`2 ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE - (CIRCUMFERENCE * threshold) / 100}
          />
        )}
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          className={cn("fill-none stroke-[10] transition-all duration-1000 ease-out", strokeClassName)}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      {children !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}
