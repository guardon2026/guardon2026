import { cn } from "@/lib/utils"

export type StatusVariant =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "inactive"
  | "sos"
  | "confirmed"
  | "unresolved"

export interface StatusBadgeProps {
  variant: StatusVariant
  label: string
  className?: string
}

const variantClasses: Record<StatusVariant, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  approved:   "bg-green-50 text-green-700 border-green-200",
  active:     "bg-green-50 text-green-700 border-green-200",
  rejected:   "bg-red-50 text-red-700 border-red-200",
  inactive:   "bg-red-50 text-red-700 border-red-200",
  sos:        "bg-red-600 text-white border-red-600",
  confirmed:  "bg-blue-50 text-blue-700 border-blue-200",
  unresolved: "bg-gray-50 text-gray-600 border-gray-200",
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}
