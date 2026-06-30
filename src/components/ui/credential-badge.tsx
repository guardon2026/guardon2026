import { Shield, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { CREDENTIAL_LABELS, type CredentialTypeKey } from "@/lib/constants"

type CredentialState = "VERIFIED" | "PENDING" | "UNVERIFIED"

const STATE_STYLES: Record<CredentialState, string> = {
  VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  UNVERIFIED: "bg-gray-100 text-gray-400 border-gray-200",
}

export interface CredentialBadgeProps {
  type: CredentialTypeKey
  state: CredentialState
  size?: "sm" | "md"
  className?: string
}

export function CredentialBadge({ type, state, size = "md", className }: CredentialBadgeProps) {
  const Icon = state === "VERIFIED" ? ShieldCheck : Shield
  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1 text-sm"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        sizeClasses,
        STATE_STYLES[state],
        className,
      )}
    >
      <Icon className="w-4 h-4" aria-hidden />
      {CREDENTIAL_LABELS[type]}
    </span>
  )
}
