"use client"

import { useState } from "react"
import Link from "next/link"
import { ADMIN_LABELS, COMPANY_STATUS_LABELS } from "@/lib/constants"

interface CompanyOwner {
  name: string
  phone: string | null
}

export interface CompanyWithOwner {
  id: string
  name: string
  licenseNumber: string
  phone: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  isActive: boolean
  createdAt: Date
  owner: CompanyOwner
}

interface CompanyApprovalTableProps {
  companies: CompanyWithOwner[]
}

export function CompanyApprovalTable({ companies }: CompanyApprovalTableProps) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [localCompanies, setLocalCompanies] = useState(companies)

  const handleAction = async (id: string, approve: boolean) => {
    const rejectionReason = approve
      ? ""
      : window.prompt("반려 사유를 입력해 주세요.")?.trim()

    if (!approve && !rejectionReason) return

    setProcessing(id)
    try {
      const endpoint = approve
        ? `/api/admin/companies/${id}/approve`
        : `/api/admin/companies/${id}/reject`
      const res = await fetch(endpoint, {
        method: "POST",
        headers: approve ? undefined : { "Content-Type": "application/json" },
        body: approve ? undefined : JSON.stringify({ rejectionReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        window.alert(data?.error ?? "처리 중 오류가 발생했습니다.")
        return
      }
      setLocalCompanies((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: approve ? "APPROVED" : "REJECTED",
                isActive: approve,
              }
            : c
        )
      )
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {["업체명", "허가번호", "대표자", "신청일", "상태", "액션"].map((h) => (
              <th
                key={h}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {localCompanies.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                {ADMIN_LABELS.PENDING_COMPANIES_EMPTY}
              </td>
            </tr>
          ) : (
            localCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  <Link
                    href={`/admin/members/${company.id}`}
                    className="text-[#2563EB] hover:underline"
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{company.licenseNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {company.owner.name}
                  {company.owner.phone && (
                    <span className="block text-xs text-gray-400">{company.owner.phone}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(company.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      company.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : company.status === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {COMPANY_STATUS_LABELS[company.status] ?? company.status}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2">
                  {company.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleAction(company.id, true)}
                        disabled={processing === company.id}
                        className="px-3 py-1 bg-[#2563EB] text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {ADMIN_LABELS.APPROVE}
                      </button>
                      <button
                        onClick={() => handleAction(company.id, false)}
                        disabled={processing === company.id}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {ADMIN_LABELS.REJECT}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
