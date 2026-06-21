import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import PayrollList from './PayrollList'
import { PAYROLL_TOTAL_MAX, PAYROLL_DAILY_MAX } from '@/lib/constants'
import type { Stage } from '@/lib/types'

function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function todayStartUTC() {
  return new Date(todayKST() + 'T00:00:00+09:00').toISOString()
}

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('payroll')) return <ActivityLocked activityKey="payroll" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'ceo' || !me.company_id) {
    return <PayrollList stage={cls.stage} notCeo members={[]} paidToday={[]} totalPaidMap={{}} todayPaidMap={{}} />
  }

  const { data: members } = await supabase
    .from('users').select('id, number, nickname, role').eq('company_id', me.company_id).order('role').order('number')

  const today = todayKST()
  const todayStart = todayStartUTC()

  // 전체·오늘 지급 횟수 (새 key 형식: payroll:{userId}:{date}:{slot})
  const memberIds = (members ?? []).map(m => m.id)
  const totalPaidMap: Record<string, number> = {}
  const todayPaidMap: Record<string, number> = {}

  for (const id of memberIds) {
    const { count: total } = await supabase
      .from('transactions').select('*', { count: 'exact', head: true })
      .like('idempotency_key', `payroll:${id}:%`)
    totalPaidMap[id] = total ?? 0

    const { count: todayCnt } = await supabase
      .from('transactions').select('*', { count: 'exact', head: true })
      .like('idempotency_key', `payroll:${id}:${today}:%`)
    todayPaidMap[id] = todayCnt ?? 0
  }

  const paidToday = memberIds.filter(id => todayPaidMap[id] >= PAYROLL_DAILY_MAX)

  // 각 직원의 오늘 업무일지
  const { data: logs } = memberIds.length > 0
    ? await supabase.from('activity_logs').select('user_id, payload, created_at')
        .in('user_id', memberIds).eq('action', 'worklog')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
    : { data: [] }

  const latestLogMap: Record<string, { text: string; created_at: string }> = {}
  for (const log of logs ?? []) {
    if (!latestLogMap[log.user_id]) {
      latestLogMap[log.user_id] = { text: log.payload?.text ?? '', created_at: log.created_at }
    }
  }

  return (
    <PayrollList
      stage={cls.stage}
      members={members ?? []}
      paidToday={paidToday}
      latestLogMap={latestLogMap}
      totalPaidMap={totalPaidMap}
      todayPaidMap={todayPaidMap}
      totalMax={PAYROLL_TOTAL_MAX}
      dailyMax={PAYROLL_DAILY_MAX}
    />
  )
}
