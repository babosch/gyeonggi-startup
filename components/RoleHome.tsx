'use client'

import { useStage } from '@/lib/useStage'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeHeader from './HomeHeader'
import StageBanner from './StageBanner'
import TaskCard from './TaskCard'
import MayorControl from './MayorControl'
import ActivityBoard from './ActivityBoard'
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
}

export default function RoleHome(props: Props) {
  const { stage, paused, openActivities } = useStage(props.classId, props.initialStage, props.openActivities, props.paused)
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isMayor = props.role === 'mayor'

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
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
            <MayorControl classId={props.classId} currentStage={stage} openActivities={openActivities} />
            <ActivityBoard classId={props.classId} open={openActivities} />
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
  const grid = 'grid grid-cols-2 sm:grid-cols-3 gap-3'
  const tasks = visibleActivities(openActivities, role)
  const theme = cityTheme(color)

  return (
    <div className="flex flex-col gap-5">
      {/* 지금 할 일 — 교사가 연 순서대로 크게 */}
      {tasks.length > 0 ? (
        <div>
          <div className="text-sm font-bold text-gray-500 mb-2 px-1">📌 지금 할 일</div>
          <div className="flex flex-col gap-3">
            {tasks.map(t => <BigTask key={t.key} task={t} theme={theme} />)}
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
        <div className={grid}>
          <TaskCard emoji="✏️" label="쪽지시험" hint="얼마나 알까?" always currentStage={0} href="/quiz" />
          <TaskCard emoji="💭" label="성찰" hint="오늘 배운 것" always currentStage={0} href="/reflect" />
        </div>
      </div>
    </div>
  )
}

// 지금 할 일 — 큼직한 가로 카드 (도시 컬러로 부각)
function BigTask({ task, theme }: { task: Activity; theme: CityTheme }) {
  const router = useRouter()
  return (
    <button onClick={() => router.push(task.href)}
      className={`${theme.soft} ${theme.border} border-2 rounded-3xl p-5 flex items-center gap-4
        w-full text-left active:scale-[0.98] transition-transform hover:shadow-sm`}>
      <span className="text-4xl">{task.emoji}</span>
      <div className="flex-1">
        <div className={`text-xl font-bold ${theme.accent}`}>{task.label}</div>
        {task.hint && <div className={`text-sm ${theme.accent} opacity-70`}>{task.hint}</div>}
      </div>
      <span className={`text-2xl ${theme.accent}`}>→</span>
    </button>
  )
}
