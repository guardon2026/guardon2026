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
export const MIN_WAGE_HOURLY = 10_320          // 2026년 최저시급 (원/시간)
export const MIN_WAGE_DAILY = MIN_WAGE_HOURLY * 8  // 최저 일급 = 82,560원
export const HIGH_RATE_THRESHOLD = 187_000     // 세금 발생 안내 기준 (원)

export interface DailyTax {
  incomeTax: number      // 소득세 (원, 원 이하 절사)
  localTax: number       // 지방소득세 (원, 원 이하 절사)
  totalTax: number       // 합계 세금 (원)
  netPay: number         // 세후 실수령액 (원)
  taxBracket: "EXEMPT" | "TAXED"  // EXEMPT: 비과세, TAXED: 과세
}

// 부동소수점 곱셈 오차(예: 24000 * 0.009 === 215.99999999999997) 때문에 Math.floor가
// 정확한 정수 결과를 1원 낮게 절사하는 걸 방지하기 위한 안전한 floor.
function floorMoney(amount: number): number {
  return Math.floor(amount + 1e-6)
}

export function calcDailyTax(dailyRate: number): DailyTax {
  const taxable = Math.max(0, dailyRate - DAILY_DEDUCTION)
  if (taxable === 0) {
    return { incomeTax: 0, localTax: 0, totalTax: 0, netPay: dailyRate, taxBracket: "EXEMPT" }
  }
  // 소득세 = 과세표준 × 6% × (1 - 55%) = 과세표준 × 2.7%
  const incomeTax = floorMoney(taxable * 0.06 * 0.45)
  const localTax = floorMoney(incomeTax * 0.1)
  const totalTax = incomeTax + localTax
  return {
    incomeTax,
    localTax,
    totalTax,
    netPay: dailyRate - totalTax,
    taxBracket: "TAXED",
  }
}

// 4대보험 근로자 부담률 (2026년 기준, 동일 업체 월 8일 이상 또는 60시간 이상 근무 시 적용)
export const PENSION_RATE = 0.045             // 국민연금
export const HEALTH_INSURANCE_RATE = 0.03545  // 건강보험 (장기요양보험 포함 근사치)
export const EMPLOYMENT_INSURANCE_RATE = 0.009 // 고용보험

export interface InsuredDailyTax {
  incomeTax: number
  localTax: number
  pension: number
  health: number
  employmentInsurance: number
  totalDeduction: number
  netPay: number
  taxBracket: "EXEMPT" | "TAXED"
}

/** 국민연금·건강보험 가입 대상 근로자의 일급 기준 공제 계산 (소득세 + 4대보험 근로자 부담분) */
export function calcInsuredDailyTax(dailyRate: number): InsuredDailyTax {
  const base = calcDailyTax(dailyRate)
  const pension = floorMoney(dailyRate * PENSION_RATE)
  const health = floorMoney(dailyRate * HEALTH_INSURANCE_RATE)
  const employmentInsurance = floorMoney(dailyRate * EMPLOYMENT_INSURANCE_RATE)
  const totalDeduction = base.totalTax + pension + health + employmentInsurance
  return {
    incomeTax: base.incomeTax,
    localTax: base.localTax,
    pension,
    health,
    employmentInsurance,
    totalDeduction,
    netPay: dailyRate - totalDeduction,
    taxBracket: base.taxBracket,
  }
}
