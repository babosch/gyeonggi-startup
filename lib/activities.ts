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
  stage: Stage    // 이 활동이 속한 수업 단계
}

export const ACTIVITIES: Activity[] = [
  { key: 'explore',     label: '도시 탐구',   emoji: '🗺️', hint: '우리 도시 알아보기', href: '/explore',     roles: ['applicant', 'ceo', 'staff', 'officer'], stage: 0 },
  { key: 'plan',        label: '사업계획서',  emoji: '📝', hint: '창업 아이디어 내기', href: '/plan',        roles: ['applicant', 'ceo'], stage: 1 },
  { key: 'apply',       label: '취업 지원',   emoji: '💼', hint: '일하고 싶은 회사에 지원',   href: '/apply',       roles: ['applicant'], stage: 1 },
  { key: 'company',     label: '회사 관리',   emoji: '🏭', hint: '회사·상품 등록',     href: '/company',     roles: ['ceo'], stage: 1 },
  { key: 'hire',        label: '직원 채용',   emoji: '👥', hint: '지원서 검토 · 채용', href: '/hire',        roles: ['ceo'], stage: 1 },
  { key: 'requisition', label: '품의서',      emoji: '🧾', hint: '물건 사기',          href: '/requisition', roles: ['ceo'], stage: 1 },
  { key: 'ledger',      label: '거래 장부',   emoji: '📖', hint: '돈 흐름 보기',       href: '/ledger',      roles: ['officer'], stage: 1 },
  { key: 'facilities',  label: '시설',        emoji: '🏪', hint: '공용 시설',          href: '/facilities',  roles: ['ceo', 'officer'], stage: 1 },
  { key: 'worklog',     label: '업무일지',    emoji: '📒', hint: '오늘 한 일',         href: '/worklog',     roles: ['staff', 'ceo', 'officer'], stage: 2 },
  { key: 'payroll',     label: '급여 지급',   emoji: '💵', hint: '직원에게 월급',      href: '/payroll',     roles: ['ceo'], stage: 2 },
  { key: 'inspection',  label: '시찰 보고서', emoji: '📋', hint: '기업 둘러보기',      href: '/inspection',  roles: ['officer'], stage: 2 },
  { key: 'exchange',    label: '교류',        emoji: '🤝', hint: '협력 기록',          href: '/exchange',    roles: ['ceo', 'officer'], stage: 3 },
  { key: 'sell',        label: '판매(수금)',  emoji: '📱', hint: 'QR 보여주기',        href: '/sell',        roles: ['ceo', 'staff'], stage: 4 },
  { key: 'card',        label: '내 카드',     emoji: '💳', hint: '잔액 확인 · 결제',  href: '/card',        roles: ['ceo', 'staff', 'officer'], stage: 4 },
  { key: 'trade-report',label: '이상 거래 보고', emoji: '🚨', hint: '이상한 거래 신고', href: '/trade-report', roles: ['officer'], stage: 4 },
]

// 단계 진입 시 보드에 자동으로 추가할 활동들 (그 단계에 새로 열리는 활동)
export function activitiesForStage(stage: Stage): string[] {
  return ACTIVITIES.filter(a => a.stage === stage).map(a => a.key)
}

// 단계 변경 시: 기존 열린 활동에 새 단계 활동을 더한다 (이전 활동 유지 — 미완 학생 배려)
export function mergeStageActivities(current: string[], stage: Stage): string[] {
  const add = activitiesForStage(stage)
  const next = [...current]
  for (const k of add) if (!next.includes(k)) next.push(k)
  return next
}

export const ACTIVITY_BY_KEY: Record<string, Activity> =
  Object.fromEntries(ACTIVITIES.map(a => [a.key, a]))

// 학생 홈: 교사가 켠 활동(open) 중 내 역할에 해당하는 것만, 교사가 짠 순서대로
export function visibleActivities(openKeys: string[], role: Role): Activity[] {
  return openKeys
    .map(k => ACTIVITY_BY_KEY[k])
    .filter((a): a is Activity => !!a && a.roles.includes(role))
}
