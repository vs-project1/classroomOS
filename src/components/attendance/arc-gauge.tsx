import { cn } from "@/lib/utils"

interface ArcGaugeProps {
  value: number
  className?: string
  showValue?: boolean
  /** When provided, color follows TU category (exact-ratio) not rounded pct */
  category?: "SAFE" | "CAUTION" | "DANGER"
}

function getArcColor(pct: number, category?: string): string {
  if (category) {
    if (category === "DANGER") return "#E11D48"
    if (category === "CAUTION") return "#F59E0B"
    return "#16A34A"
  }
  if (pct < 75) return "#E11D48" // DANGER <75 (TU mandate)
  if (pct < 80) return "#F59E0B" // CAUTION 75-79
  return "#16A34A" // SAFE >=80
}

export function ArcGauge({ value, className, showValue = true, category }: ArcGaugeProps) {
  const pct = Math.max(0, Math.min(100, value))
  const color = getArcColor(pct, category)
  // Half-circle gauge: 180deg arc from 180° to 0° (left to right)
  // Needle rotation: -90deg at 0% (pointing left), +90deg at 100% (pointing right)
  const needleRotation = pct * 1.8 - 90

  return (
    <div
      data-testid="arc-gauge"
      className={cn("relative flex flex-col items-center", className)}
    >
      {/* Segmented arc background */}
      <div className="relative w-48 h-28 overflow-hidden">
        <svg
          viewBox="0 0 100 50"
          className="h-full w-full"
          aria-hidden="true"
        >
          {/* Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            stroke="#E2E8F0"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Segmented fill — 3 color zones rendered as progress */}
          {/* Red zone 0-60, Amber 60-80, Green 80-100. We render single colored path up to pct. */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 126} 126`}
            className="transition-all duration-700 ease-out"
          />
          {/* Threshold tick at 80% */}
          <line
            x1="78"
            y1="18"
            x2="78"
            y2="30"
            stroke="#0F172A"
            strokeWidth="0.8"
            opacity="0.35"
          />
        </svg>

        {/* Needle pivot at bottom center */}
        <div
          data-testid="arc-needle"
          className="absolute bottom-0 left-1/2 h-12 w-0.5 origin-bottom bg-slate-900 transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-50%) rotate(${needleRotation}deg)` }}
          aria-hidden="true"
        />
        {/* Pivot dot */}
        <div
          className="absolute bottom-0 left-1/2 size-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white"
          aria-hidden="true"
        />
      </div>

      {showValue ? (
        <span
          className="mt-1 text-[48px] font-bold leading-none tracking-tighter tabular-nums"
          style={{ color }}
        >
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
  )
}
