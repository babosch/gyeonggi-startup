import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSubmissions } from '@/lib/submissions'
import RoleHome from '@/components/RoleHome'
import RevealWatcher from '@/components/RevealWatcher'
import type { Role, Stage } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users')
    .select('number, nickname, role, company_id, must_change_pin, intro_seen, reveal_pending, class_id, classes(id, name, color, stage, paused, fair_mode, open_activities)')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/login')
  if (me.must_change_pin) redirect('/pin-change')
  // 교사는 인트로 없음. 학생은 최초 1회 인트로.
  if (me.role !== 'mayor' && !me.intro_seen) redirect('/intro')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as {
    id: string; name: string; color: string; stage: Stage; paused: boolean; fair_mode: boolean; open_activities: string[]
  }

  const role = me.role as Role

  // 회사 정보 (CEO·직원)
  let companyName: string | null = null
  let balance = 0
  let balanceLabel = '내 잔액'

  if (me.company_id) {
    const { data: company } = await supabase
      .from('companies').select('display_name, balance').eq('id', me.company_id).single()
    companyName = company?.display_name ?? null
    if (role === 'ceo') { balance = company?.balance ?? 0; balanceLabel = '회사 잔액' }
  }

  if (role === 'officer') {
    balanceLabel = '시청 잔액'
    const { data: cityAcct } = await supabase
      .from('accounts').select('balance').eq('owner_type', 'city').eq('owner_id', cls.id).maybeSingle()
    balance = cityAcct?.balance ?? 0
  } else if (role === 'staff' || role === 'applicant') {
    const { data: myAcct } = await supabase
      .from('accounts').select('balance').eq('owner_type', 'user').eq('owner_id', user.id).maybeSingle()
    balance = myAcct?.balance ?? 0
  }

  // 교사 홈에 쌓일 학생 결과물
  const submissions = role === 'mayor' ? await getSubmissions(supabase, cls.id) : null

  return (
    <>
      {role !== 'mayor' && (
        <RevealWatcher userId={user.id} initialPending={me.reveal_pending as 'ceo' | 'staff' | 'officer' | null} />
      )}
      <RoleHome
        classId={cls.id}
        cityName={cls.name}
        color={cls.color}
        initialStage={cls.stage}
        paused={cls.paused}
        role={role}
        number={me.number}
        nickname={me.nickname}
        companyName={companyName}
        balance={balance}
        balanceLabel={balanceLabel}
        openActivities={cls.open_activities ?? []}
        fairMode={cls.fair_mode ?? false}
        submissions={submissions}
      />
    </>
  )
}
