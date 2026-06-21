// 확정 상수 (사양서 기준)
export const GRANT_AMOUNT = 100_000        // 기본 지원금
export const SPECIALTY_BONUS = 20_000      // 특산품 연계 보너스
export const MAX_COMPANIES_PER_CLASS = 4   // 반당 최대 기업
export const MAX_STAFF_PER_COMPANY = 6     // CEO 제외 직원 최대
export const MIN_STAFF_PER_COMPANY = 4     // CEO 제외 직원 최소 필수 채용

// 2026년 최저시급(10,320원/h) 기준, 1시간 적용 후 100원 단위 올림
export const WAGE = {
  ceo: 11_000,     // CEO 최고 임금
  officer: 10_400,
  staff: 10_400,
} as const

// 단계별 급여 지급 최대 일수 (해당 단계 내에서만 카운트)
// 생산 4일 + 교류 1일 + 판매 1일 = 최대 6일
export const STAGE_PAYROLL_MAX: Partial<Record<number, number>> = {
  2: 4,  // 생산단계: 최대 4일
  3: 1,  // 교류단계: 최대 1일
  4: 1,  // 판매단계: 최대 1일
}

export const PRODUCT_PRICE = { min: 1, max: 100_000 }
