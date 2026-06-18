// 확정 상수 (사양서 기준)
export const GRANT_AMOUNT = 100_000        // 기본 지원금
export const SPECIALTY_BONUS = 20_000      // 특산품 연계 보너스
export const MAX_COMPANIES_PER_CLASS = 4   // 반당 최대 기업
export const MAX_STAFF_PER_COMPANY = 4     // CEO 제외 직원 최대

export const WAGE = {
  ceo: 4_500,
  officer: 3_500,
  staff: 3_000,
} as const

export const PRODUCT_PRICE = { min: 1, max: 100_000 }
