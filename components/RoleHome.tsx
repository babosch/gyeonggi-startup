'use client'

import { useStage } from '@/lib/useStage'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HomeHeader from './HomeHeader'
import StageBanner from './StageBanner'
import TaskCard from './TaskCard'
import MayorControl from './MayorControl'
import type { Role, Stage } from '@/lib/types'

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
}

export default function RoleHome(props: Props) {
  const { stage } = useStage(props.classId, props.initialStage)
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
          <MayorControl classId={props.classId} currentStage={stage} />
        ) : (
          <>
            <StageBanner stage={stage} paused={props.paused} />
            <RoleTasks role={props.role} stage={stage} />
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

interface CardDef {
  emoji: string; label: string; hint?: string; href: string; opensAt: Stage
}

// 역할별 "단계 기능" 카드 — opensAt 순서대로 (학습 흐름)
const ROLE_TASKS: Record<Role, CardDef[]> = {
  applicant: [
    { emoji: '🗺️', label: '도시 탐구', hint: '우리 도시 알아보기', href: '/explore', opensAt: 0 },
    { emoji: '📝', label: '사업계획서', hint: '창업 아이디어 내기', href: '/plan', opensAt: 1 },
  ],
  ceo: [
    { emoji: '🏭', label: '회사 관리', hint: '회사·상품 등록', href: '/company', opensAt: 1 },
    { emoji: '👥', label: '직원 채용', href: '/hire', opensAt: 1 },
    { emoji: '🧾', label: '품의서', hint: '물건 사기', href: '/requisition', opensAt: 1 },
    { emoji: '💵', label: '급여 지급', href: '/payroll', opensAt: 2 },
    { emoji: '🤝', label: '교류', hint: '협력 기록', href: '/exchange', opensAt: 3 },
    { emoji: '📱', label: '수금 QR', hint: '판매 받기', href: '/sell', opensAt: 4 },
    { emoji: '💳', label: '내 카드', hint: '물건 살 때', href: '/card', opensAt: 4 },
  ],
  staff: [
    { emoji: '📒', label: '업무일지', hint: '오늘 한 일', href: '/worklog', opensAt: 2 },
    { emoji: '💳', label: '내 카드', hint: '물건 살 때 보여줘요', href: '/card', opensAt: 4 },
  ],
  officer: [
    { emoji: '🏪', label: '시설 관리', hint: '공용 시설', href: '/facilities', opensAt: 1 },
    { emoji: '📖', label: '거래 장부', href: '/ledger', opensAt: 1 },
    { emoji: '📋', label: '시찰 보고서', hint: '기업 둘러보기', href: '/inspection', opensAt: 2 },
    { emoji: '🤝', label: '교류 중개', hint: '협력 기록', href: '/exchange', opensAt: 3 },
  ],
  mayor: [],
}

function RoleTasks({ role, stage }: { role: Role; stage: Stage }) {
  const grid = 'grid grid-cols-2 sm:grid-cols-3 gap-3'
  const tasks = [...(ROLE_TASKS[role] ?? [])].sort((a, b) => a.opensAt - b.opensAt)
  if (tasks.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {/* 단계 기능 — 흐름 순서대로 */}
      <div>
        <div className="text-sm font-bold text-gray-500 mb-2 px-1">📌 오늘 할 일</div>
        <div className={grid}>
          {tasks.map(t => (
            <TaskCard key={t.href} emoji={t.emoji} label={t.label} hint={t.hint}
              opensAt={t.opensAt} currentStage={stage} href={t.href} />
          ))}
        </div>
      </div>

      {/* 항상 열린 활동 */}
      <div>
        <div className="text-sm font-bold text-gray-500 mb-2 px-1">🌟 언제든지 해요</div>
        <div className={grid}>
          <TaskCard emoji="✏️" label="쪽지시험" hint="얼마나 알까?" always currentStage={stage} href="/quiz" />
          <TaskCard emoji="💭" label="성찰" hint="오늘 배운 것" always currentStage={stage} href="/reflect" />
        </div>
      </div>
    </div>
  )
}
