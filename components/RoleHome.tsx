'use client'

import { useState } from 'react'
import { useStage } from '@/lib/useStage'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeHeader from './HomeHeader'
import StageBanner from './StageBanner'
import MayorControl from './MayorControl'
import ActivityBoard from './ActivityBoard'
import SubmissionsView from './SubmissionsView'
import Link from 'next/link'
import { allActivitiesForStage } from '@/lib/activities'
import PausedOverlay from './PausedOverlay'
import { visibleActivities, type Activity } from '@/lib/activities'
import { cityTheme, type Role, type Stage, type CityTheme } from '@/lib/types'

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
      {/* 교사가 멈추면 학생 화면을 흐리게 덮음 */}
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
            <RoleTasks role={props.role} openActivities={openActivities} color={props.color} />
          </>
        )}

        <button onClick={logout}
          className="mt-2 mx-auto text-sm text-gray-400 underline">
          로그아웃
        </button>
      </div>
    </div>
  )
}

// 학생 홈: 교사가 켠 활동(openActivities)만, 교사가 짠 순서대로 부각.
function RoleTasks({ role, openActivities, color }: { role: Role; openActivities: string[]; color: string }) {
  const tasks = visibleActivities(openActivities, role)
  const theme = cityTheme(color)

  return (
    <div className="flex flex-col gap-4">
      {/* 지금 할 일 */}
      {tasks.length > 0 ? (
        <div>
          <div className="text-sm font-bold text-gray-500 mb-2 px-1">📌 지금 할 일</div>
          <div className="grid grid-cols-3 gap-3">
            {tasks.map(t => <SquareTask key={t.key} task={t} theme={theme} active />)}
          </div>
        </div>
      ) : (
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

// ─── 교사 홈 ─────────────────────────────────────────────────────────
function MayorHome({ classId, stage, openActivities, paused, fairMode, submissions }: {
  classId: string; stage: Stage; openActivities: string[]; paused: boolean; fairMode: boolean
  submissions: { plans: any[]; research: any[]; reflections: any[] } | null
}) {
  const [boardOpen, setBoardOpen] = useState(false)
  const [addingAll, setAddingAll] = useState(false)

  async function openAllStageActivities() {
    setAddingAll(true)
    const all = allActivitiesForStage(stage)
    const next = [...openActivities]
    for (const k of all) if (!next.includes(k)) next.push(k)
    const supabase = createClient()
    await supabase.from('classes').update({ open_activities: next }).eq('id', classId)
    setAddingAll(false)
    window.location.reload()
  }

  const CARDS = [
    { emoji: '🗺️', label: '도시 탐구 현황', desc: '워드클라우드·묶기·도시 카드', href: '/admin/citycard' },
    { emoji: '⭐', label: '사업체 선정', desc: '계획서 심사·창업가 선정·지원금', href: '/admin/plans' },
    { emoji: '🧾', label: '품의서 결재', desc: '물품 구입 승인', href: '/admin/requisitions' },
    { emoji: '📡', label: '종합 모니터링', desc: '학생 관리·채용·거래·잔액 수정', href: '/admin/monitor' },
    { emoji: '🚨', label: '이상 거래 보고', desc: '공무원이 신고한 거래 검토', href: '/admin/trade-reports' },
    { emoji: '🏙️', label: '도시 대표 카드', desc: '탐구 결과로 카드 만들기', href: '/admin/citycard' },
    { emoji: '📊', label: '평가 대시보드', desc: '타임라인·개념 응답·학생별 현황', href: '/admin/submissions' },
    { emoji: '🛡️', label: '관리자 설정', desc: '학생 계정·공무원 임명', href: '/admin' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* 단계 컨트롤 */}
      <MayorControl classId={classId} currentStage={stage} openActivities={openActivities} paused={paused} fairMode={fairMode} />

      {/* 수업 보드 (접을 수 있음) */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <button
          onClick={() => setBoardOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div className="text-left">
              <div className="font-bold text-gray-800">수업 보드</div>
              <div className="text-xs text-gray-400">
                지금 열린 활동 {openActivities.length}개 · 탭 눌러 열고 닫기
              </div>
            </div>
          </div>
          <span className="text-gray-400 text-lg">{boardOpen ? '▲' : '▼'}</span>
        </button>

        {boardOpen && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-3 flex flex-col gap-3">
            <button onClick={openAllStageActivities} disabled={addingAll}
              className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-xl py-2.5 text-sm font-medium hover:bg-blue-100 disabled:opacity-40">
              {addingAll ? '추가 중…' : `+ 이번 단계(${stage}) 활동 전체 추가`}
            </button>
            <ActivityBoard classId={classId} open={openActivities} />
          </div>
        )}
      </div>

      {/* 기능 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map(c => (
          <Link key={c.href + c.label} href={c.href}
            className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 active:scale-[0.98]">
            <span className="text-3xl">{c.emoji}</span>
            <div className="font-bold text-gray-800 text-base leading-tight">{c.label}</div>
            <div className="text-xs text-gray-400 leading-tight">{c.desc}</div>
          </Link>
        ))}
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

// ─── 정사각형 카드 (그리드용) ────────────────────────────────────────
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
