'use client'

import { useState } from 'react'
import { useStage } from '@/lib/useStage'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeHeader from './HomeHeader'
import NoticeBanner from './NoticeBanner'
import StageBanner from './StageBanner'
import MayorControl from './MayorControl'
import ActivityBoard from './ActivityBoard'
import SubmissionsView from './SubmissionsView'
import Link from 'next/link'
import { ACTIVITY_BY_KEY, ALWAYS_ON_BY_ROLE, ACTIVITIES, type Activity } from '@/lib/activities'
import PausedOverlay from './PausedOverlay'
import { cityTheme, STAGE_SHORT, STAGE_SESSIONS, STAGE_THEME, type Role, type Stage, type CityTheme } from '@/lib/types'

interface Props {
  classId: string
  cityName: string
  color: string
  initialStage: Stage
  paused: boolean
  role: Role
  number: number
  nickname: string | null
  companyName: string | null
  balance: number
  balanceLabel: string
  openActivities: string[]
  fairMode: boolean
  submissions: { plans: any[]; research: any[]; reflections: any[] } | null
  notices: { id: string; title: string; body: string; created_at: string }[]
}

export default function RoleHome(props: Props) {
  const { stage, paused, fairMode, openActivities } = useStage(props.classId, props.initialStage, props.openActivities, props.paused, props.fairMode)
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isMayor = props.role === 'mayor'

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {!isMayor && paused && <PausedOverlay />}
      <div className="max-w-3xl mx-auto flex flex-col gap-4">

        <HomeHeader
          cityName={props.cityName}
          color={props.color}
          role={props.role}
          number={props.number}
          nickname={props.nickname}
          subtitle={props.companyName ?? undefined}
          balanceLabel={isMayor ? undefined : props.balanceLabel}
          balance={isMayor ? undefined : props.balance}
        />

        <NoticeBanner notices={props.notices} />

        {isMayor ? (
          <MayorHome
            classId={props.classId}
            stage={stage}
            openActivities={openActivities}
            paused={paused}
            fairMode={fairMode}
            submissions={props.submissions}
          />
        ) : (
          <>
            <StageBanner stage={stage} paused={paused} />
            <RoleTasks role={props.role} openActivities={openActivities} color={props.color} stage={stage} />
          </>
        )}

        <button onClick={logout} className="mt-2 mx-auto text-sm text-gray-400 underline">
          로그아웃
        </button>
      </div>
    </div>
  )
}

// ─── 학생 홈 ─────────────────────────────────────────────────────────────
function RoleTasks({ role, openActivities, color, stage }: {
  role: Role; openActivities: string[]; color: string; stage: Stage
}) {
  const theme = cityTheme(color)

  // 교사가 연 활동 (이 역할에 해당하는 것)
  const teacherOpened = openActivities
    .map(k => ACTIVITY_BY_KEY[k])
    .filter((a): a is Activity => !!a && a.roles.includes(role))

  // 역할 상시 활동 (stage 이하인 것 중 교사가 아직 안 연 것)
  const alwaysOnKeys = ALWAYS_ON_BY_ROLE[role] ?? []
  const alwaysOnExtras = alwaysOnKeys
    .map(k => ACTIVITY_BY_KEY[k])
    .filter((a): a is Activity =>
      !!a && a.roles.includes(role) && a.stage <= stage && !openActivities.includes(a.key)
    )

  // 이번 단계에서 내 역할에 해당하는 모든 활동 (수업 보드용)
  const stageAllForRole = ACTIVITIES.filter(a => a.stage === stage && a.roles.includes(role))
  const openSet = new Set(openActivities)

  return (
    <div className="flex flex-col gap-4">
      {/* 수업 보드 — 이번 단계 전체 흐름 */}
      {stageAllForRole.length > 0 && (
        <div className="bg-white rounded-3xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-black text-gray-700">📚 이번 단계 수업</span>
            <span className="text-xs bg-blue-100 text-blue-600 font-bold rounded-full px-2 py-0.5">{STAGE_SESSIONS[stage]}</span>
          </div>
          <div className="text-xs text-gray-400 mb-3">{STAGE_THEME[stage]}</div>
          <div className="flex flex-wrap gap-2">
            {stageAllForRole.map(a => {
              const isOpen = openSet.has(a.key) || (ALWAYS_ON_BY_ROLE[role]?.includes(a.key) ?? false)
              return (
                <div key={a.key}
                  className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium border-2
                    ${isOpen
                      ? `${theme.soft} ${theme.border} ${theme.accent}`
                      : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  <span>{a.emoji}</span>
                  <span>{a.label}</span>
                  {!isOpen && <span className="text-xs opacity-60">🔒</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 교사가 연 활동 */}
      {teacherOpened.length > 0 && (
        <div>
          <div className="text-sm font-bold text-gray-500 mb-2 px-1">📌 지금 할 일</div>
          <div className="grid grid-cols-3 gap-3">
            {teacherOpened.map(t => <SquareTask key={t.key} task={t} theme={theme} active />)}
          </div>
        </div>
      )}

      {/* 역할 기본 상시 메뉴 */}
      {alwaysOnExtras.length > 0 && (
        <div>
          <div className="text-sm font-bold text-gray-500 mb-2 px-1">🔧 내 역할 기본 메뉴</div>
          <div className="grid grid-cols-3 gap-3">
            {alwaysOnExtras.map(t => <SquareTask key={t.key} task={t} theme={theme} />)}
          </div>
        </div>
      )}

      {/* 아무것도 없을 때 */}
      {teacherOpened.length === 0 && alwaysOnExtras.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
          <div className="text-4xl mb-2">🌱</div>
          <p className="text-gray-600 font-medium">선생님이 활동을 열어줄 때까지 기다려요</p>
        </div>
      )}

      {/* 항상 열린 활동 */}
      <div>
        <div className="text-sm font-bold text-gray-500 mb-2 px-1">🌟 언제든지 해요</div>
        <div className="grid grid-cols-3 gap-3">
          <SquareTask task={{ key: 'quiz', label: '쪽지시험', emoji: '✏️', hint: '얼마나 알까?', href: '/quiz', roles: [], stage: 0 }} theme={theme} />
          <SquareTask task={{ key: 'reflect', label: '성찰', emoji: '💭', hint: '오늘 배운 것', href: '/reflect', roles: [], stage: 0 }} theme={theme} />
        </div>
      </div>
    </div>
  )
}

// ─── 교사 홈 ─────────────────────────────────────────────────────────────
// 단계별 핵심 바로가기 + 활동 보드 + 전체 관리 그리드
const STAGE_FEATURED: Record<Stage, Array<{ emoji: string; label: string; desc: string; href: string; color: string }>> = {
  0: [
    { emoji: '🗺️', label: '도시 탐구 현황',  desc: '워드클라우드 · 대표카드 만들기', href: '/admin/citycard',      color: 'bg-green-500' },
    { emoji: '📊', label: '평가 현황',        desc: '학생 탐구 제출물 확인',          href: '/admin/submissions',   color: 'bg-emerald-500' },
  ],
  1: [
    { emoji: '⭐', label: '사업체 선정',      desc: '계획서 심사 · 창업가 선정',     href: '/admin/plans',         color: 'bg-amber-500' },
    { emoji: '🧾', label: '품의서 결재',      desc: '물품 구입 승인',                href: '/admin/requisitions',  color: 'bg-orange-500' },
  ],
  2: [
    { emoji: '📡', label: '종합 모니터링',    desc: '업무일지 · 채용 · 거래 확인',   href: '/admin/monitor',       color: 'bg-blue-500' },
    { emoji: '💵', label: '급여 지급',        desc: '업무일지 확인 후 직원 급여 지급', href: '/payroll',            color: 'bg-indigo-500' },
  ],
  3: [
    { emoji: '🤝', label: '교류 전체 현황',   desc: '도시별 카드 · 교류 성사 일지',   href: '/admin/exchange-monitor', color: 'bg-purple-500' },
    { emoji: '📋', label: '공무원 급여',      desc: '교류 업무일지 확인 후 지급',     href: '/admin/officer-payroll',  color: 'bg-violet-500' },
  ],
  4: [
    { emoji: '📡', label: '종합 모니터링',    desc: '판매 현황 · 거래 내역',         href: '/admin/monitor',       color: 'bg-blue-500' },
    { emoji: '🚨', label: '이상 거래 보고',   desc: '공무원이 신고한 거래',          href: '/admin/trade-reports', color: 'bg-red-500' },
  ],
}

const ADMIN_CARDS = [
  { emoji: '📡', label: '종합 모니터링',   desc: '학생 관리·채용·거래·잔액',      href: '/admin/monitor' },
  { emoji: '⭐', label: '사업체 선정',     desc: '계획서 심사·창업가 선정',        href: '/admin/plans' },
  { emoji: '🧾', label: '품의서 결재',     desc: '물품 구입 승인',                 href: '/admin/requisitions' },
  { emoji: '🏪', label: '시설 신청 결재',  desc: '시설 사용 신청 승인·반려',        href: '/admin/facilities' },
  { emoji: '💰', label: '지원금 추가 지급', desc: '회사에 지원금 추가로 주기',        href: '/admin/grant' },
  { emoji: '🗺️', label: '도시 대표 카드', desc: '탐구 결과 워드클라우드·카드',     href: '/admin/citycard' },
  { emoji: '🚨', label: '이상 거래 보고', desc: '공무원 신고 거래 검토',           href: '/admin/trade-reports' },
  { emoji: '📊', label: '평가 현황',       desc: '개념 응답·제출물 확인',          href: '/admin/submissions' },
  { emoji: '🤝', label: '교류 전체 현황', desc: '도시별 카드·교류 성사 일지',      href: '/admin/exchange-monitor' },
  { emoji: '📋', label: '공무원 임명',     desc: '지원자를 공무원으로 임명',        href: '/admin/officers' },
  { emoji: '🏛️', label: '공무원 급여',    desc: '업무일지 확인 후 급여 지급',      href: '/admin/officer-payroll' },
  { emoji: '📊', label: '현황 보드',       desc: '반 전체 진행·시찰·경보',          href: '/admin/board' },
  { emoji: '🛡️', label: '관리자 설정',    desc: '학생 계정 생성·핀번호 초기화',    href: '/admin' },
]

function MayorHome({ classId, stage, openActivities, paused, fairMode, submissions }: {
  classId: string; stage: Stage; openActivities: string[]; paused: boolean; fairMode: boolean
  submissions: { plans: any[]; research: any[]; reflections: any[] } | null
}) {
  const [boardOpen, setBoardOpen] = useState(true)
  const featured = STAGE_FEATURED[stage]

  return (
    <div className="flex flex-col gap-4">
      {/* 단계 컨트롤 */}
      <MayorControl classId={classId} currentStage={stage} openActivities={openActivities} paused={paused} fairMode={fairMode} />

      {/* 이번 단계 핵심 바로가기 */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-sm font-bold text-gray-500">⚡ 이번 단계 핵심</span>
          <span className="text-xs font-bold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">{STAGE_SESSIONS[stage]}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {featured.map(c => (
            <Link key={c.href + c.label} href={c.href}
              className={`${c.color} rounded-3xl p-5 text-white flex flex-col gap-1.5 active:scale-[0.98] transition-transform shadow-sm`}>
              <span className="text-3xl">{c.emoji}</span>
              <div className="font-bold text-base leading-tight">{c.label}</div>
              <div className="text-xs opacity-80 leading-tight">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* 수업 보드 */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <button onClick={() => setBoardOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div className="text-left">
              <div className="font-bold text-gray-800">수업 보드 — 활동 열기/닫기</div>
              <div className="text-xs text-gray-400">열린 활동 {openActivities.length}개 · 클릭해서 열거나 닫아요</div>
            </div>
          </div>
          <span className="text-gray-400 text-lg">{boardOpen ? '▲' : '▼'}</span>
        </button>

        {boardOpen && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <ActivityBoard classId={classId} open={openActivities} stage={stage} />
          </div>
        )}
      </div>

      {/* 전체 관리 카드 그리드 */}
      <div>
        <div className="text-sm font-bold text-gray-500 mb-2 px-1">🛠️ 전체 관리</div>
        <div className="grid grid-cols-3 gap-2.5">
          {ADMIN_CARDS.map(c => (
            <Link key={c.label} href={c.href}
              className="bg-white rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1 active:scale-[0.97]">
              <span className="text-2xl">{c.emoji}</span>
              <div className="font-bold text-gray-800 text-sm leading-tight">{c.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {submissions && (
        <SubmissionsView
          plans={submissions.plans}
          research={submissions.research}
          reflections={submissions.reflections}
        />
      )}
    </div>
  )
}

// ─── 정사각형 카드 ────────────────────────────────────────────────────────
function SquareTask({ task, theme, active }: { task: Activity; theme: CityTheme; active?: boolean }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(task.href)}
      className={`${active ? `${theme.soft} ${theme.border} border-2` : 'bg-white border-2 border-gray-100'}
        rounded-3xl p-4 flex flex-col items-center justify-center gap-2 text-center
        aspect-square active:scale-[0.96] transition-transform hover:shadow-sm`}>
      <span className="text-4xl leading-none">{task.emoji}</span>
      <div className={`text-sm font-bold leading-tight ${active ? theme.accent : 'text-gray-700'}`}>
        {task.label}
      </div>
      {task.hint && (
        <div className={`text-xs leading-tight ${active ? `${theme.accent} opacity-60` : 'text-gray-400'}`}>
          {task.hint}
        </div>
      )}
    </button>
  )
}
