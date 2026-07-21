"use client"

interface WorkerRow {
  name: string
  birthDate: string
  phone: string
  workDates: string[]
  dailyRate: number
  incomeTax: number
  localTax: number
  netPay: number
}

interface Props {
  sosTitle: string
  employerName: string
  employerBizNumber: string
  workers: WorkerRow[]
}

export default function TaxReportExport({ sosTitle, employerName, employerBizNumber, workers }: Props) {
  function downloadCsv(content: string, filename: string) {
    const bom = "﻿"
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleWithholdingCsv() {
    const rows = [
      ["구분", "성명", "생년월일", "연락처", "근무일수", "총지급액(세전)", "소득세", "지방소득세", "차인지급액(세후)"],
      ...workers.map((w) => [
        "일용근로자",
        w.name,
        w.birthDate,
        w.phone,
        String(w.workDates.length),
        String(w.dailyRate * w.workDates.length),
        String(w.incomeTax * w.workDates.length),
        String(w.localTax * w.workDates.length),
        String(w.netPay * w.workDates.length),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    downloadCsv(csv, `원천징수_${sosTitle}_${new Date().toLocaleDateString("ko-KR")}.csv`)
  }

  function handleLaborCsv() {
    const rows = [
      ["성명", "생년월일", "연락처", "근무일자"],
      ...workers.flatMap((w) =>
        w.workDates.map((date) => [w.name, w.birthDate, w.phone, date])
      ),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    downloadCsv(csv, `일용직노무신고_${sosTitle}_${new Date().toLocaleDateString("ko-KR")}.csv`)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        onClick={handleWithholdingCsv}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-blue-300 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        📥 원천징수 CSV
      </button>
      <button
        onClick={handleLaborCsv}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-green-300 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
      >
        📥 노무 신고 CSV
      </button>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        🖨️ 인쇄
      </button>
    </div>
  )
}
