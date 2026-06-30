import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as React from "react"

type ButtonBaseProps = React.ComponentProps<typeof Button>

export interface PrimaryButtonProps extends ButtonBaseProps {
  intent?: "primary" | "destructive" | "secondary" | "ghost"
}

const INTENT_CLASSES = {
  primary:     "bg-brand text-white hover:bg-brand-dark",
  destructive: "bg-sos text-white hover:bg-sos-dark",
  secondary:   "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  ghost:       "bg-transparent text-gray-600 hover:bg-gray-100",
}

export function PrimaryButton({ intent = "primary", className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-semibold min-h-[44px] transition-colors",
        INTENT_CLASSES[intent],
        className,
      )}
      {...props}
    />
  )
}
