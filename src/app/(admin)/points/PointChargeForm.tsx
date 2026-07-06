"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Coins } from "lucide-react"

interface UserItem {
  id: string
  name: string | null
  email: string | null
  role: string
  phone: string | null
  pointAccount: { balance: number } | null
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_OWNER: "업체 대표",
  WORKER: "경비 인력",
}

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000, 1000000]

export default function PointChargeForm({ users }: { users: UserItem[] }) {
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const selectedUser = users.find((u) => u.id === selectedUserId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    const amt = parseInt(amount, 10)
    if (!selectedUserId) { setError("유저를 선택해 주세요."); return }
    if (isNaN(amt) || amt <= 0) { setError("충전 금액을 올바르게 입력해 주세요."); return }

    setLoading(true)
    try {
      const res = await fetch("/api/points/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          amount: amt,
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "충전 중 오류가 발생했습니다.")
        return
      }
      const data = await res.json()
      setSuccess(`충전 완료! 새 잔액: ${data.balance.toLocaleString()}P`)
      setAmount("")
      setDescription("")
      setTimeout(() => router.refresh(), 1000)
    } catch {
      setError("네트워크 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 충전 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Coins className="w-4 h-4 text-brand" />
          포인트 충전
        </h2>

        {/* 유저 선택 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500">유저 선택</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">— 유저를 선택하세요 —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                [{ROLE_LABELS[u.role] ?? u.role}] {u.name ?? "이름 없음"} ({u.email ?? u.phone ?? u.id.slice(0, 8)}) — {(u.pointAccount?.balance ?? 0).toLocaleString()}P
              </option>
            ))}
          </select>
        </div>

        {/* 선택된 유저 잔액 */}
        {selectedUser && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
            <span className="text-gray-500">현재 잔액: </span>
            <span className="font-bold text-brand">{(selectedUser.pointAccount?.balance ?? 0).toLocaleString()}P</span>
          </div>
        )}

        {/* 빠른 금액 선택 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500">빠른 선택</label>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  amount === String(a)
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {a.toLocaleString()}P
              </button>
            ))}
          </div>
        </div>

        {/* 직접 입력 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500">충전 포인트</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="직접 입력 (P)"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {/* 메모 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500">메모 (선택)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="충전 사유"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "처리 중..." : "포인트 충전"}
        </button>
      </form>

      {/* 유저 목록 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">전체 유저 포인트 현황</p>
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                selectedUserId === u.id ? "border-brand bg-blue-50/30" : "border-gray-100 hover:bg-gray-50"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-medium">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{u.name ?? "이름 없음"}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{u.email ?? u.phone ?? u.id.slice(0, 12)}</p>
              </div>
              <p className={`text-sm font-bold ${(u.pointAccount?.balance ?? 0) === 0 ? "text-gray-300" : "text-brand"}`}>
                {(u.pointAccount?.balance ?? 0).toLocaleString()}P
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
