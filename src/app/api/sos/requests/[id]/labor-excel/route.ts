export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "@/lib/session"
import { UserRole } from "@prisma/client"
import { getSosLaborReport, type LaborWorkerGroup } from "@/lib/labor-report"

// GET /api/sos/requests/[id]/labor-excel
// 근로복지공단 고용·산재보험 토탈서비스 "근로내용확인신고(전자신고용)" 양식에
// 이 SOS의 확정 인력 데이터를 채워 넣어 다운로드한다.

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "labor-content-report-template.xlsx")

// 국적코드 100 = 대한민국. 체류자격코드 0-0 = 체류자격없음(내국인).
// 직종코드 541 = 경호·경비직 소분류(한국고용직업분류 2025, 세분류 5413 시설 및 특수 경비원 포함) — GuardOn 인력의 업무 성격과 가장 가까운 코드.
const NATIONALITY_CODE = "100"
const RESIDENCE_STATUS_CODE = "0-0"
const OCCUPATION_CODE = "541"
// 보험구분 5 = 산재+고용보험. GuardOn은 모든 매칭에 고용보험(tax.ts)을 항상 적용하고,
// 산재보험은 일용직 포함 전 근로자에게 법적으로 자동 적용되므로 항상 5로 신고한다.
const INSURANCE_TYPE_ALL = "5"
// 이직사유코드 1 = 회사의 사정에 의한 이직(계약기간 만료 등) — SOS는 건별 단기 계약 성격상 항상 이에 해당.
const LEAVING_REASON_CONTRACT_END = "1"

function splitPhone(phone: string | null): [string, string, string] {
  if (!phone) return ["", "", ""]
  const parts = phone.split("-")
  if (parts.length === 3) return [parts[0], parts[1], parts[2]]
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11) return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)]
  if (digits.length === 10) return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)]
  return [phone, "", ""]
}

function dayColumn(dayOfMonth: number): number {
  // A=1 ... I=9(직종코드), J=10("1일") ... AN=40("31일")
  return 9 + dayOfMonth
}

interface MonthRow {
  yearMonth: string // YYYY-MM
  dates: string[]
  incomeTax: number
  localTax: number
  avgHours: number
}

function groupByMonth(group: LaborWorkerGroup, hoursByDate: Map<string, number>): MonthRow[] {
  const byMonth = new Map<string, { dates: string[]; incomeTax: number; localTax: number }>()
  for (const d of group.matchBreakdown) {
    const ym = d.scheduleDate.slice(0, 7)
    const existing = byMonth.get(ym)
    if (existing) {
      existing.dates.push(d.scheduleDate)
      existing.incomeTax += d.incomeTax
      existing.localTax += d.localTax
    } else {
      byMonth.set(ym, { dates: [d.scheduleDate], incomeTax: d.incomeTax, localTax: d.localTax })
    }
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, v]) => {
      const hoursList = v.dates.map((d) => hoursByDate.get(d) ?? 8)
      const avgHours = hoursList.reduce((s, h) => s + h, 0) / hoursList.length
      return { yearMonth, dates: v.dates, incomeTax: v.incomeTax, localTax: v.localTax, avgHours }
    })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }
  if (session.user.role !== UserRole.COMPANY_OWNER) {
    return NextResponse.json({ error: "경비 업체 계정만 다운로드할 수 있습니다." }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })
  if (!company) {
    return NextResponse.json({ error: "업체 정보를 찾을 수 없습니다." }, { status: 404 })
  }

  const report = await getSosLaborReport(id, company.id)
  if (!report) {
    return NextResponse.json({ error: "SOS 요청을 찾을 수 없습니다." }, { status: 404 })
  }
  const { sos, effectiveDailyRate, dayDetails, workerGroups } = report

  const hoursByDate = new Map(dayDetails.map((d) => [d.date, d.hours]))

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(TEMPLATE_PATH)
  const sheet = workbook.getWorksheet("서식")
  if (!sheet) {
    return NextResponse.json({ error: "신고 양식 템플릿을 불러오지 못했습니다." }, { status: 500 })
  }

  let rowIndex = 2 // 1행은 헤더
  for (const group of workerGroups) {
    const months = groupByMonth(group, hoursByDate)
    const [areaCode, exchangeCode, subscriberCode] = splitPhone(group.phone)

    for (const m of months) {
      const row = sheet.getRow(rowIndex)
      const days = m.dates.length
      const grossPay = effectiveDailyRate * days

      row.getCell(1).value = INSURANCE_TYPE_ALL
      row.getCell(2).value = group.workerName
      row.getCell(3).value = group.rrnRaw ?? ""
      row.getCell(4).value = NATIONALITY_CODE
      row.getCell(5).value = RESIDENCE_STATUS_CODE
      row.getCell(6).value = areaCode
      row.getCell(7).value = exchangeCode
      row.getCell(8).value = subscriberCode
      row.getCell(9).value = OCCUPATION_CODE

      for (const date of m.dates) {
        const dayOfMonth = Number(date.slice(8, 10))
        if (dayOfMonth >= 1 && dayOfMonth <= 31) {
          row.getCell(dayColumn(dayOfMonth)).value = 1
        }
      }

      row.getCell(41).value = days // 근로일수
      row.getCell(42).value = Number(m.avgHours.toFixed(1)) // 일평균근로시간
      row.getCell(43).value = days // 보수지급기초일수
      row.getCell(44).value = grossPay // 보수총액(과세소득)
      row.getCell(45).value = grossPay // 임금총액
      row.getCell(46).value = LEAVING_REASON_CONTRACT_END // 이직사유코드
      // AU/AV(보험료부과구분 부호·사유) — 해당자만 기재, GuardOn 표준 케이스는 공란
      row.getCell(49).value = "Y" // 국세청 일용근로소득 신고여부
      row.getCell(50).value = m.yearMonth.replace("-", "") // 지급월 YYYYMM
      row.getCell(51).value = grossPay // 총지급액(과세소득)
      row.getCell(52).value = 0 // 비과세소득
      row.getCell(53).value = m.incomeTax // 소득세
      row.getCell(54).value = m.localTax // 지방소득세

      rowIndex++
    }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const filename = encodeURIComponent(`근로내용확인신고_${sos.title}.xlsx`)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
