export type Role = 'mayor' | 'applicant' | 'ceo' | 'staff' | 'officer'
export type Stage = 0 | 1 | 2 | 3 | 4

export const STAGE_LABELS: Record<Stage, string> = {
  0: '⓪ 도시 탐구',
  1: '① 창업',
  2: '② 생산',
  3: '③ 교류',
  4: '④ 판매',
}

export const STAGE_SHORT: Record<Stage, string> = {
  0: '탐구', 1: '창업', 2: '생산', 3: '교류', 4: '판매',
}

export const STAGE_SESSIONS: Record<Stage, string> = {
  0: '1차시', 1: '2~4차시', 2: '4차시', 3: '2차시', 4: '2차시',
}

export const STAGE_THEME: Record<Stage, string> = {
  0: '우리 도시의 특산품과 강점을 조사해요',
  1: '사업계획을 세우고 회사를 창업해요',
  2: '물건을 만들고 업무일지를 기록해요',
  3: '다른 도시 기업과 협력하고 교류해요',
  4: '제품을 판매하고 거래를 정산해요',
}

// 역할별 라벨·이모지 (4학년 친근형)
export const ROLE_INFO: Record<Role, { label: string; emoji: string }> = {
  mayor:     { label: '시장',   emoji: '🏛️' },
  applicant: { label: '지원자', emoji: '🙋' },
  ceo:       { label: 'CEO',    emoji: '👑' },
  staff:     { label: '직원',   emoji: '🛠️' },
  officer:   { label: '공무원', emoji: '📋' },
}

// 도시별 테마 클래스 묶음 (Tailwind safelist 위해 전체 문자열 명시)
export interface CityTheme {
  header: string   // 진한 헤더 배경 + 흰 글씨
  soft: string     // 밝은 카드 배경
  border: string   // 카드 테두리
  accent: string   // 강조 텍스트
  solid: string    // 진한 버튼 배경
  ring: string     // 선택 강조 테두리
}

export const CITY_THEME: Record<string, CityTheme> = {
  blue: {
    header: 'bg-blue-500 text-white',
    soft: 'bg-blue-50', border: 'border-blue-200',
    accent: 'text-blue-700', solid: 'bg-blue-500', ring: 'border-blue-400',
  },
  purple: {
    header: 'bg-purple-500 text-white',
    soft: 'bg-purple-50', border: 'border-purple-200',
    accent: 'text-purple-700', solid: 'bg-purple-500', ring: 'border-purple-400',
  },
  green: {
    header: 'bg-green-500 text-white',
    soft: 'bg-green-50', border: 'border-green-200',
    accent: 'text-green-700', solid: 'bg-green-500', ring: 'border-green-400',
  },
  amber: {
    header: 'bg-amber-500 text-white',
    soft: 'bg-amber-50', border: 'border-amber-200',
    accent: 'text-amber-700', solid: 'bg-amber-500', ring: 'border-amber-400',
  },
  pink: {
    header: 'bg-pink-500 text-white',
    soft: 'bg-pink-50', border: 'border-pink-200',
    accent: 'text-pink-700', solid: 'bg-pink-500', ring: 'border-pink-400',
  },
}

export function cityTheme(color: string): CityTheme {
  return CITY_THEME[color] ?? CITY_THEME.blue
}

// 단순 배경 클래스 (로그인 등에서 사용)
export const CITY_COLORS: Record<string, string> = {
  blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500',
  amber: 'bg-amber-500', pink: 'bg-pink-500',
}

export interface ClassRow {
  id: string
  name: string
  code: string
  color: string
  stage: Stage
  fair_mode: boolean
  paused: boolean
  notice: string | null
  session_open: boolean
}

export interface UserRow {
  id: string
  class_id: string
  number: number
  nickname: string | null
  role: Role
  company_id: string | null
  intro_seen: boolean
  reveal_pending: 'ceo' | 'staff' | 'officer' | null
  must_change_pin: boolean
}
