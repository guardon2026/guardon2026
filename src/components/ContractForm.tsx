"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, ArrowLeft, Printer } from "lucide-react"
import type { WorkContract } from "@prisma/client"

interface SosInfo {
  title: string
  locationAddress: string
  hourlyRate: number
  workPeriod: string
  workHours: string
  workerName: string
}

interface Prefill {
  employerName?: string
  employerBizNumber?: string
  employerAddress?: string
}

interface Props {
  matchId: string
  sosId: string
  role: "employer" | "worker"
  contract: WorkContract | null
  prefill?: Prefill
  sosInfo: SosInfo
}

function formatBizNumber(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

export default function ContractForm({ matchId, sosId, role, contract, prefill, sosInfo }: Props) {
  const router = useRouter()
  const isEmployer = role === "employer"

  // 업체 대표 필드
  const [bizNumber, setBizNumber] = useState(contract?.employerBizNumber ?? prefill?.employerBizNumber ?? "")
  const [empName,   setEmpName]   = useState(contract?.employerName    ?? prefill?.employerName    ?? "")
  const [ceoName,   setCeoName]   = useState(contract?.employerCeoName ?? "")
  const [empAddr,   setEmpAddr]   = useState(contract?.employerAddress  ?? prefill?.employerAddress ?? "")

  // 경비 인력 필드
  const [realName,   setRealName]   = useState(contract?.workerRealName      ?? "")
  const [birthDate,  setBirthDate]  = useState(contract?.workerBirthDate     ?? "")
  const [wAddr,      setWAddr]      = useState(contract?.workerAddress        ?? "")
  const [wPhone,     setWPhone]     = useState(contract?.workerPhone          ?? "")
  const [bankName,   setBankName]   = useState(contract?.workerBankName       ?? "")
  const [accountNum, setAccountNum] = useState(contract?.workerAccountNum     ?? "")
  const [accountHolder, setAccountHolder] = useState(contract?.workerAccountHolder ?? "")

  const [saving,  setSaving]  = useState(false)
  const [signing, setSigning] = useState(false)
  const [error,   setError]   = useState("")
  const [saved,   setSaved]   = useState(false)

  const employerSigned = !!contract?.employerSignedAt
  const workerSigned   = !!contract?.workerSignedAt
  const bothSigned     = employerSigned && workerSigned
  const mySigned       = isEmployer ? employerSigned : workerSigned

  async function buildBody(sign: boolean) {
    if (isEmployer) {
      return { employerBizNumber: bizNumber, employerName: empName, employerCeoName: ceoName, employerAddress: empAddr, sign }
    }
    return { workerRealName: realName, workerBirthDate: birthDate, workerAddress: wAddr, workerPhone: wPhone, workerBankName: bankName, workerAccountNum: accountNum, workerAccountHolder: accountHolder, sign }
  }

  async function handleSave() {
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/contracts/${matchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await buildBody(false)) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "저장 실패"); return }
      setSaved(true)
      router.refresh()
    } catch { setError("네트워크 오류") } finally { setSaving(false) }
  }

  async function handleSign() {
    setSigning(true); setError("")
    try {
      const res = await fetch(`/api/contracts/${matchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await buildBody(true)) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "서명 실패"); return }
      router.refresh()
    } catch { setError("네트워크 오류") } finally { setSigning(false) }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              <h1 className="text-base font-bold text-gray-900">일용직 근로계약서</h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{sosInfo.title}</p>
          </div>
        </div>
        {bothSigned && (
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-3.5 h-3.5" />
            인쇄
          </button>
        )}
      </div>

      {/* 서명 상태 배너 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "사업주 서명", signed: employerSigned, date: contract?.employerSignedAt },
          { label: "근로자 서명", signed: workerSigned,   date: contract?.workerSignedAt },
        ].map(({ label, signed, date }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 flex items-center gap-2 ${signed ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${signed ? "text-green-500" : "text-gray-300"}`} />
            <div>
              <p className={`text-xs font-semibold ${signed ? "text-green-700" : "text-gray-400"}`}>{label}</p>
              {signed && date && <p className="text-xs text-green-600">{new Date(date).toLocaleDateString("ko-KR")}</p>}
              {!signed && <p className="text-xs text-gray-400">미서명</p>}
            </div>
          </div>
        ))}
      </div>

      {bothSigned && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium text-center">
          ✅ 양측 서명이 완료되었습니다. 계약서가 유효합니다.
        </div>
      )}

      {/* 계약서 본문 */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 print:border-0">

        {/* 근무 조건 (자동 입력) */}
        <Section title="근무 조건">
          <Row label="근무 장소" value={sosInfo.locationAddress} />
          <Row label="근무 기간" value={sosInfo.workPeriod} />
          <Row label="근무 시간" value={sosInfo.workHours} />
          <Row label="일    급" value={`${sosInfo.hourlyRate.toLocaleString()}원`} />
          <Row label="지급 방법" value="프로젝트 완료 후 14일 이내 계좌이체" />
          <Row label="업무 내용" value={sosInfo.title} />
        </Section>

        {/* 사업주(업체 대표) 정보 */}
        <Section title={`사업주 정보 ${isEmployer && !mySigned ? "(직접 입력)" : ""}`}>
          {isEmployer && !mySigned ? (
            <div className="space-y-3 py-1">
              <Field label="업체명" value={empName} onChange={setEmpName} placeholder="주식회사 가드온" />
              <Field label="사업자등록번호" value={bizNumber} onChange={(v) => setBizNumber(formatBizNumber(v))} placeholder="000-00-00000" inputMode="numeric" />
              <Field label="대표자 성명" value={ceoName} onChange={setCeoName} placeholder="홍길동" />
              <Field label="업체 주소" value={empAddr} onChange={setEmpAddr} placeholder="서울시 강남구..." />
            </div>
          ) : (
            <>
              <Row label="업체명" value={contract?.employerName ?? "-"} />
              <Row label="사업자번호" value={contract?.employerBizNumber ?? "-"} />
              <Row label="대표자" value={contract?.employerCeoName ?? "-"} />
              <Row label="주소" value={contract?.employerAddress ?? "-"} />
            </>
          )}
        </Section>

        {/* 근로자(경비 인력) 정보 */}
        <Section title={`근로자 정보 ${!isEmployer && !mySigned ? "(직접 입력)" : ""}`}>
          {!isEmployer && !mySigned ? (
            <div className="space-y-3 py-1">
              <Field label="성명" value={realName} onChange={setRealName} placeholder="홍길동" />
              <Field label="생년월일" value={birthDate} onChange={setBirthDate} placeholder="YYYYMMDD" inputMode="numeric" maxLength={8} />
              <Field label="주소" value={wAddr} onChange={setWAddr} placeholder="서울시..." />
              <Field label="연락처" value={wPhone} onChange={(v) => setWPhone(formatPhone(v))} placeholder="010-0000-0000" inputMode="numeric" />
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <p className="text-xs font-medium text-gray-500">정산 계좌 (원천징수 후 입금)</p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="은행명" value={bankName} onChange={setBankName} placeholder="국민은행" />
                  <Field label="계좌번호" value={accountNum} onChange={setAccountNum} placeholder="00000000000" inputMode="numeric" />
                  <Field label="예금주" value={accountHolder} onChange={setAccountHolder} placeholder="홍길동" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <Row label="성명" value={contract?.workerRealName ?? sosInfo.workerName ?? "-"} />
              <Row label="생년월일" value={contract?.workerBirthDate ?? "-"} />
              <Row label="주소" value={contract?.workerAddress ?? "-"} />
              <Row label="연락처" value={contract?.workerPhone ?? "-"} />
              <Row label="은행명" value={contract?.workerBankName ?? "-"} />
              <Row label="계좌번호" value={contract?.workerAccountNum ?? "-"} />
              <Row label="예금주" value={contract?.workerAccountHolder ?? "-"} />
            </>
          )}
        </Section>

        {/* 원천징수 안내 */}
        <Section title="원천징수 안내">
          <p className="text-xs text-gray-500 leading-relaxed py-1">
            사업주(업체 대표)는 근로자에게 일급을 지급할 때 일용근로소득세 및 지방소득세를 원천징수하여 납부하여야 합니다.
            일급 150,000원 초과분에 대해 소득세 6% × (1-55%) = 2.7%, 지방소득세 0.27%가 적용됩니다.
            원천징수 후 세후 차인지급액을 근로자 계좌로 이체합니다.
          </p>
        </Section>
      </div>

      {/* 액션 버튼 */}
      {!mySigned && (
        <div className="space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {saved && <p className="text-xs text-green-600">임시 저장되었습니다.</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? "저장 중..." : "임시 저장"}
            </button>
            <button
              onClick={handleSign}
              disabled={signing}
              className="flex-1 h-11 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {signing ? "서명 중..." : "내용 확인 후 서명"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            서명 후에는 {isEmployer ? "사업주" : "근로자"} 정보를 수정할 수 없습니다.
          </p>
        </div>
      )}

      {mySigned && !bothSigned && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 text-center">
          서명이 완료되었습니다. 상대방의 서명을 기다리고 있습니다.
        </div>
      )}

      <div className="pb-6">
        <button onClick={() => router.push(isEmployer ? `/sos/${sosId}` : "/worker-history")} className="text-xs text-gray-400 hover:text-gray-600 underline">
          {isEmployer ? "SOS 상세로 돌아가기" : "매칭 이력으로 돌아가기"}
        </button>
      </div>
    </div>
  )
}

// ── 서브 컴포넌트 ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, inputMode, maxLength }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; maxLength?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
      />
    </div>
  )
}
