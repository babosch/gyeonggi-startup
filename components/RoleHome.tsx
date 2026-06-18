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

function RoleTasks({ role, stage }: { role: Role; stage: Stage }) {
  const grid = 'grid grid-cols-2 sm:grid-cols-3 gap-3'

  if (role === 'applicant') return (
    <div className={grid}>
      <TaskCard emoji="🗺️" label="도시 탐구" hint="우리 도시 알아보기" opensAt={0} currentStage={stage} href="/explore" />
      <TaskCard emoji="📝" label="사업계획서" hint="창업 아이디어 내기" opensAt={1} currentStage={stage} href="/plan" />
      <TaskCard emoji="💭" label="성찰" hint="오늘 배운 것" always currentStage={stage} href="/reflect" />
    </div>
  )

  if (role === 'ceo') return (
    <div className={grid}>
      <TaskCard emoji="🏭" label="회사 관리" hint="회사·상품 등록" opensAt={1} currentStage={stage} href="/company" />
      <TaskCard emoji="👥" label="직원 채용" opensAt={1} currentStage={stage} href="/hire" />
      <TaskCard emoji="🧾" label="품의서" hint="물건 사기" opensAt={1} currentStage={stage} href="/requisition" />
      <TaskCard emoji="💵" label="급여 지급" opensAt={2} currentStage={stage} href="/payroll" />
      <TaskCard emoji="📱" label="수금 QR" hint="판매 받기" opensAt={4} currentStage={stage} href="/sell" />
      <TaskCard emoji="💳" label="내 카드" hint="물건 살 때" opensAt={4} currentStage={stage} href="/card" />
      <TaskCard emoji="💭" label="성찰" always currentStage={stage} href="/reflect" />
    </div>
  )

  if (role === 'staff') return (
    <div className={grid}>
      <TaskCard emoji="📒" label="업무일지" hint="오늘 한 일" opensAt={2} currentStage={stage} href="/worklog" />
      <TaskCard emoji="💳" label="내 카드" hint="물건 살 때 보여줘요" opensAt={4} currentStage={stage} href="/card" />
      <TaskCard emoji="💭" label="성찰" always currentStage={stage} href="/reflect" />
    </div>
  )

  if (role === 'officer') return (
    <div className={grid}>
      <TaskCard emoji="📋" label="시찰 보고서" hint="기업 둘러보기" opensAt={2} currentStage={stage} href="/inspection" />
      <TaskCard emoji="🏪" label="시설 관리" hint="공용 시설" opensAt={1} currentStage={stage} href="/facilities" />
      <TaskCard emoji="📖" label="거래 장부" opensAt={1} currentStage={stage} href="/ledger" />
      <TaskCard emoji="💭" label="성찰" always currentStage={stage} href="/reflect" />
    </div>
  )

  return null
}
