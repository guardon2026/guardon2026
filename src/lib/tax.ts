// 일용근로소득세 계산 유틸 (2026년 기준)
//
// 근거:
//  - 일용근로소득 비과세: 일 공제액 150,000원 이하
//  - 산출세액 = (일급 - 150,000) × 6%
//  - 세액공제 = 산출세액 × 55% (근로소득세액공제)
//  - 소득세 = 산출세액 × (1 - 55%) = (일급 - 150,000) × 2.7%
//  - 지방소득세 = 소득세 × 10%
//  - 187,000원 이상 구간: 세금이 실질적으로 발생하는 기준선

export const DAILY_DEDUCTION = 150_000         // 일 공제액 (원)
export const MIN_WAGE_HOURLY = 10_030          // 2026년 최저시급 (원/시간)
export const MIN_WAGE_DAILY = MIN_WAGE_HOURLY * 8  // 최저 일급 = 80,240원
export const HIGH_RATE_THRESHOLD = 187_000     // 세금 발생 안내 기준 (원)

export interface DailyTax {
  incomeTax: number      // 소득세 (원, 원 이하 절사)
  localTax: number       // 지방소득세 (원, 원 이하 절사)
  totalTax: number       // 합계 세금 (원)
  netPay: number         // 세후 실수령액 (원)
  taxBracket: "EXEMPT" | "TAXED"  // EXEMPT: 비과세, TAXED: 과세
}

export function calcDailyTax(dailyRate: number): DailyTax {
  const taxable = Math.max(0, dailyRate - DAILY_DEDUCTION)
  if (taxable === 0) {
    return { incomeTax: 0, localTax: 0, totalTax: 0, netPay: dailyRate, taxBracket: "EXEMPT" }
  }
  // 소득세 = 과세표준 × 6% × (1 - 55%) = 과세표준 × 2.7%
  const incomeTax = Math.floor(taxable * 0.06 * 0.45)
  const localTax = Math.floor(incomeTax * 0.1)
  const totalTax = incomeTax + localTax
  return {
    incomeTax,
    localTax,
    totalTax,
    netPay: dailyRate - totalTax,
    taxBracket: "TAXED",
  }
}
