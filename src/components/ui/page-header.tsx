import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "warning" | "success" | "danger"

interface PageHeaderBadge {
  label: string
  variant: BadgeVariant
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  badge?: PageHeaderBadge
}

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-600",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-green-50 text-green-700",
  danger: "bg-red-50 text-red-700",
}

export function PageHeader({ title, subtitle, action, badge }: PageHeaderProps) {
  return (
    <div className="border-b border-gray-100 pb-5 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {badge && (
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  badgeVariantClasses[badge.variant],
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
