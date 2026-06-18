export type Role = 'mayor' | 'applicant' | 'ceo' | 'staff' | 'officer'
export type Stage = 0 | 1 | 2 | 3 | 4

export const STAGE_LABELS: Record<Stage, string> = {
  0: '⓪ 도시 탐구',
  1: '① 창업',
  2: '② 생산',
  3: '③ 교류',
  4: '④ 판매',
}

export const CITY_COLORS: Record<string, string> = {
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
  green:  'bg-green-500',
  amber:  'bg-amber-500',
  pink:   'bg-pink-500',
}

export const CITY_COLORS_LIGHT: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-800',
  purple: 'bg-purple-50 border-purple-200 text-purple-800',
  green:  'bg-green-50 border-green-200 text-green-800',
  amber:  'bg-amber-50 border-amber-200 text-amber-800',
  pink:   'bg-pink-50 border-pink-200 text-pink-800',
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
}
