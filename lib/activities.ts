import type { Role, Stage } from '@/lib/types'

// 교사가 수업 보드에서 켜고/끄고/순서를 정하는 활동 카탈로그.
// 상시 활동(쪽지시험·성찰)은 보드와 무관하게 항상 열림.
export interface Activity {
  key: string
  label: string
  emoji: string
  hint?: string
  href: string
  roles: Role[]   // 이 활동이 보이는 역할
  stage: Stage    // 이 활동이 속한 수업 단계 (ActivityBoard 버킷)
}

export const ACTIVITIES: Activity[] = [
  // ─── 0단계 도시탐구 ────────────────────────────────────────────────────
  { key: 'explore',      label: '도시 탐구',      emoji: '🗺️', hint: '우리 도시 알아보기', href: '/explore',      roles: ['applicant', 'ceo', 'staff', 'officer'], stage: 0 },

  // ─── 1단계 창업 ────────────────────────────────────────────────────────
  { key: 'plan',         label: '사업계획서',     emoji: '📝', hint: '창업 아이디어 내기',   href: '/plan',         roles: ['applicant', 'ceo'], stage: 1 },
  { key: 'apply',        label: '취업 지원',      emoji: '💼', hint: '일하고 싶은 회사에 지원', href: '/apply',      roles: ['applicant'], stage: 1 },
  { key: 'company',      label: '회사 관리',      emoji: '🏭', hint: '회사·상품 등록',       href: '/company',      roles: ['ceo'], stage: 1 },
  { key: 'hire',         label: '직원 채용',      emoji: '👥', hint: '지원서 검토 · 채용',   href: '/hire',         roles: ['ceo'], stage: 1 },
  { key: 'requisition',  label: '품의서',         emoji: '🧾', hint: '물건 구입 신청',       href: '/requisition',  roles: ['ceo'], stage: 1 },

  // ─── 2단계 생산 ────────────────────────────────────────────────────────
  { key: 'ledger',       label: '거래 장부',      emoji: '📖', hint: '돈 흐름 보기',         href: '/ledger',       roles: ['officer'], stage: 2 },
  { key: 'facilities',   label: '시설',           emoji: '🏪', hint: '공용 시설',            href: '/facilities',   roles: ['ceo', 'officer'], stage: 2 },
  { key: 'worklog',      label: '업무일지',       emoji: '📒', hint: '오늘 한 일',           href: '/worklog',      roles: ['staff', 'ceo', 'officer'], stage: 2 },
  { key: 'payroll',      label: '급여 지급',      emoji: '💵', hint: '직원에게 급여 지급',   href: '/payroll',      roles: ['ceo'], stage: 2 },
  { key: 'inspection',   label: '시찰 보고서',    emoji: '📋', hint: '기업 둘러보기',        href: '/inspection',   roles: ['officer'], stage: 2 },
  { key: 'card',         label: '내 카드',        emoji: '💳', hint: '잔액 확인 · 결제',    href: '/card',         roles: ['ceo', 'staff', 'officer'], stage: 2 },

  // ─── 3단계 교류 ────────────────────────────────────────────────────────
  { key: 'exchange',     label: '교류',           emoji: '🤝', hint: '협력 요청 · 매칭',    href: '/exchange',     roles: ['ceo', 'officer'], stage: 3 },

  // ─── 4단계 판매 ────────────────────────────────────────────────────────
  { key: 'sell',         label: '판매(수금)',     emoji: '📱', hint: 'QR 보여주기',          href: '/sell',         roles: ['ceo', 'staff'], stage: 4 },
  { key: 'trade-report', label: '이상 거래 보고', emoji: '🚨', hint: '이상한 거래 신고',     href: '/trade-report', roles: ['officer'], stage: 4 },
]

// ─── 역할별 상시 활동 ─────────────────────────────────────────────────────
// 교사가 열지 않아도 창업(1단계) 이상이면 해당 역할에게 항상 보임.
// 교사는 ActivityBoard에서 추가로 제어 가능.
export const ALWAYS_ON_BY_ROLE: Partial<Record<Role, string[]>> = {
  ceo:     ['company', 'worklog', 'payroll', 'card'],
  staff:   ['worklog', 'card'],
  officer: ['worklog', 'ledger', 'facilities', 'inspection', 'exchange', 'trade-report', 'card'],
}

// ─── 단계별 열릴 활동 세트 ──────────────────────────────────────────────
// 단계 전환 시 open_activities를 이 목록으로 교체.
// 지난 단계 활동 중 불필요한 것은 제거, 계속 필요한 것은 유지.
export const STAGE_OPEN: Record<Stage, string[]> = {
  0: ['explore'],
  1: ['plan', 'apply', 'hire', 'requisition'],
  2: ['worklog', 'payroll', 'ledger', 'facilities', 'card', 'inspection'],
  3: ['worklog', 'payroll', 'ledger', 'facilities', 'card', 'inspection', 'exchange'],
  4: ['worklog', 'payroll', 'ledger', 'facilities', 'card', 'inspection', 'sell', 'trade-report'],
}

// 특정 단계의 모든 활동 (ActivityBoard 버킷용)
export function allActivitiesForStage(stage: Stage): string[] {
  return ACTIVITIES.filter(a => a.stage === stage).map(a => a.key)
}

// 단계 전환·초기화용: 해당 단계의 큐레이션된 열림 목록
export function allActivitiesUpToStage(stage: Stage): string[] {
  return STAGE_OPEN[stage] ?? []
}

export const ACTIVITY_BY_KEY: Record<string, Activity> =
  Object.fromEntries(ACTIVITIES.map(a => [a.key, a]))

// 학생 홈: 교사가 켠 활동(open) 중 내 역할에 해당하는 것 + 상시 활동(stage 이하인 것)
export function visibleActivities(openKeys: string[], role: Role, stage?: Stage): Activity[] {
  const teacherOpened = openKeys
    .map(k => ACTIVITY_BY_KEY[k])
    .filter((a): a is Activity => !!a && a.roles.includes(role))

  if (stage === undefined) return teacherOpened

  // 상시 활동: 교사 설정 없이 자동 노출
  // 공무원은 생산(2단계)부터 모든 상시 메뉴 표시; 나머지는 활동 자체 단계 기준
  const alwaysOnKeys = ALWAYS_ON_BY_ROLE[role] ?? []
  const alwaysOn = alwaysOnKeys
    .map(k => ACTIVITY_BY_KEY[k])
    .filter((a): a is Activity => {
      if (!a || !a.roles.includes(role)) return false
      return role === 'officer' ? stage >= 2 : a.stage <= stage
    })

  // 교사 설정 순서 유지, 상시 활동 중 중복 제외 후 뒤에 추가
  const seen = new Set(teacherOpened.map(a => a.key))
  const extras = alwaysOn.filter(a => !seen.has(a.key))
  return [...teacherOpened, ...extras]
}
