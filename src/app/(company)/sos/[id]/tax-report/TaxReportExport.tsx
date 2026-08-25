"use client"

interface WorkerRow {
  name: string
  rrn: string
  birthDate: string
  phone: string
  workDates: string[]
  insuredDates: string[]   // workDates 중 4대보험(국민연금·건강보험) 가입 대상인 날짜
  dailyRate: number
  totalGross: number
  totalIncomeTax: number
  totalLocalTax: number
  totalPension: number
  totalHealth: number
  totalEmploymentInsurance: number
  netPay: number
}

interface Props {
  sosId: string
  sosTitle: string
  employerName: string
  employerBizNumber: string
  workers: WorkerRow[]
}

export default function TaxReportExport({ sosId, sosTitle, employerName, employerBizNumber, workers }: Props) {
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

  function insuranceLabel(w: WorkerRow): string {
    if (w.insuredDates.length === 0) return "일용직"
    if (w.insuredDates.length === w.workDates.length) return "4대보험대상"
    return `혼합(4대보험 ${w.insuredDates.length}/${w.workDates.length}일)`
  }

  function handleWithholdingCsv() {
    const rows = [
      [
        "구분", "성명", "주민등록번호", "생년월일", "연락처", "근무일수", "총지급액(세전)",
        "소득세", "지방소득세", "국민연금", "건강보험", "고용보험", "차인지급액(세후)",
      ],
      ...workers.map((w) => [
        insuranceLabel(w),
        w.name,
        w.rrn,
        w.birthDate,
        w.phone,
        String(w.workDates.length),
        String(w.totalGross),
        String(w.totalIncomeTax),
        String(w.totalLocalTax),
        String(w.totalPension),
        String(w.totalHealth),
        String(w.totalEmploymentInsurance),
        String(w.netPay),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    downloadCsv(csv, `원천징수_${sosTitle}_${new Date().toLocaleDateString("ko-KR")}.csv`)
  }

  function handleLaborCsv() {
    const rows = [
      ["성명", "주민등록번호", "생년월일", "연락처", "근무일자", "구분"],
      ...workers.flatMap((w) =>
        w.workDates.map((date) => [
          w.name,
          w.rrn,
          w.birthDate,
          w.phone,
          date,
          w.insuredDates.includes(date) ? "4대보험대상" : "일용직",
        ])
      ),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
    downloadCsv(csv, `노무신고_${sosTitle}_${new Date().toLocaleDateString("ko-KR")}.csv`)
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
      <a
        href={`/api/sos/requests/${sosId}/labor-excel`}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-purple-300 bg-purple-50 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
      >
        📥 근로내용확인신고(근로복지공단) 엑셀
      </a>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        🖨️ 인쇄
      </button>
    </div>
  )
}
