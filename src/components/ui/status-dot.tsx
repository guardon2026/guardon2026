import { cn } from "@/lib/utils"
import { AVAILABILITY_LABELS, type AvailabilityStatusKey } from "@/lib/constants"

const DOT_STYLES: Record<AvailabilityStatusKey, { dot: string; pill: string }> = {
  AVAILABLE:   { dot: "bg-green-500",  pill: "bg-green-100 text-green-700" },
  UNAVAILABLE: { dot: "bg-gray-400",   pill: "bg-gray-100 text-gray-500" },
  BUSY:        { dot: "bg-yellow-500", pill: "bg-yellow-100 text-yellow-700" },
}

export interface StatusDotProps {
  status: AvailabilityStatusKey
  className?: string
}

export function StatusDot({ status, className }: StatusDotProps) {
  const { dot, pill } = DOT_STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold",
        pill,
        className,
      )}
    >
      <span className={cn("w-2 h-2 rounded-full", dot)} aria-hidden />
      {AVAILABILITY_LABELS[status]}
    </span>
  )
}
