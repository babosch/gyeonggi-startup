'use client'

import { useStage } from '@/lib/useStage'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeHeader from './HomeHeader'
import StageBanner from './StageBanner'
import MayorControl from './MayorControl'
import ActivityBoard from './ActivityBoard'
import SubmissionsView from './SubmissionsView'
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
          <>
            <MayorControl classId={props.classId} currentStage={stage} openActivities={openActivities} paused={paused} fairMode={fairMode} />
            <ActivityBoard classId={props.classId} open={openActivities} />
            {props.submissions && (
              <SubmissionsView
                plans={props.submissions.plans}
                research={props.submissions.research}
                reflections={props.submissions.reflections}
              />
            )}
          </>
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

// 정사각형 카드 (그리드용)
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
