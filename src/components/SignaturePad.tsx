"use client"

import { useEffect, useRef, useState } from "react"
import { Eraser } from "lucide-react"

interface Props {
  onSave: (dataUrl: string) => void
  onCancel: () => void
  saving?: boolean
}

export default function SignaturePad({ onSave, onCancel, saving }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)

  // 캔버스 해상도를 실제 표시 크기에 맞춰 잡아준다 — 고정 width/height(440x200)를
  // 쓰면 화면이 좁을 때(모바일) CSS로 줄어든 표시 크기와 내부 좌표계가 어긋나,
  // 레이아웃이 넘치거나 서명이 터치 위치와 다른 곳에 그려진다.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    if (width > 0 && height > 0) {
      canvas.width = Math.round(width)
      canvas.height = Math.round(height)
    }
  }, [])

  function getContext() {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext("2d")
  }

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(e)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const ctx = getContext()
    const last = lastPointRef.current
    if (!ctx || !last) return
    const point = pointFromEvent(e)
    ctx.strokeStyle = "#111827"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    if (!hasDrawn) setHasDrawn(true)
  }

  function handlePointerUp() {
    drawingRef.current = false
    lastPointRef.current = null
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) return
    onSave(canvas.toDataURL("image/png"))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full min-w-0 max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4">
        <div>
          <h3 className="font-bold text-gray-900">서명해 주세요</h3>
          <p className="text-xs text-gray-500 mt-1">아래 칸에 마우스나 손가락으로 직접 서명해 주세요.</p>
        </div>

        <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            className="w-full h-[200px] touch-none cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {!hasDrawn && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 pointer-events-none select-none">
              여기에 서명
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          <Eraser className="w-3.5 h-3.5" />
          다시 그리기
        </button>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn || saving}
            className="flex-1 h-11 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "저장 중..." : "서명 완료"}
          </button>
        </div>
      </div>
    </div>
  )
}
