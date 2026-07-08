"use client"

import { useState } from "react"
import { Coins } from "lucide-react"
import PointChargeModal from "@/components/ui/PointChargeModal"

export default function ChargeButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
      >
        <Coins className="w-4 h-4" />
        포인트 충전
      </button>
      {open && <PointChargeModal onClose={() => setOpen(false)} showReceipt />}
    </>
  )
}
