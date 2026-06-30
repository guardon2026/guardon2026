import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardTrend {
  value: number
  label: string
}

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: StatCardTrend
  variant?: "default" | "brand" | "sos"
}

const iconContainerClasses: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "bg-gray-100 text-gray-500",
  brand:   "bg-blue-50 text-brand",
  sos:     "bg-red-50 text-sos",
}

export function StatCard({ label, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const isPositive = trend && trend.value >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mt-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-xs",
                isPositive ? "text-green-600" : "text-red-500",
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {isPositive ? "+" : ""}
                {trend.value} {trend.label}
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
            iconContainerClasses[variant],
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
