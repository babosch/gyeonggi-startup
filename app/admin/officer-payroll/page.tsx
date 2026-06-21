import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OfficerPayrollView from './OfficerPayrollView'
import { PAYROLL_TOTAL_MAX, PAYROLL_DAILY_MAX } from '@/lib/constants'

function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function todayStartUTC() {
  return new Date(todayKST() + 'T00:00:00+09:00').toISOString()
}

export default async function OfficerPayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(stage)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/home')

  const { data: officers } = await supabase
    .from('users').select('id, number, nickname')
    .eq('class_id', me.class_id!).eq('role', 'officer')
    .order('number')

  const officerIds = (officers ?? []).map(o => o.id)
  const today = todayKST()
  const todayStart = todayStartUTC()

  // 전체·오늘 지급 횟수
  const totalPaidMap: Record<string, number> = {}
  const todayPaidMap: Record<string, number> = {}
  for (const id of officerIds) {
    const { count: total } = await supabase
      .from('transactions').select('*', { count: 'exact', head: true })
      .like('idempotency_key', `payroll:${id}:%`)
    totalPaidMap[id] = total ?? 0

    const { count: todayCnt } = await supabase
      .from('transactions').select('*', { count: 'exact', head: true })
      .like('idempotency_key', `payroll:${id}:${today}:%`)
    todayPaidMap[id] = todayCnt ?? 0
  }

  const paidToday = officerIds.filter(id => todayPaidMap[id] >= PAYROLL_DAILY_MAX)

  // 오늘 업무일지
  const { data: logs } = officerIds.length > 0
    ? await supabase.from('activity_logs')
        .select('user_id, payload, created_at')
        .in('user_id', officerIds).eq('action', 'worklog')
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
    : { data: [] }

  const latestLogMap: Record<string, { text: string; created_at: string }> = {}
  for (const log of logs ?? []) {
    if (!latestLogMap[log.user_id]) {
      latestLogMap[log.user_id] = { text: log.payload?.text ?? '', created_at: log.created_at }
    }
  }

  const officerData = (officers ?? []).map(o => ({
    id: o.id, number: o.number, nickname: o.nickname,
    worklog: latestLogMap[o.id] ?? null,
  }))

  return (
    <OfficerPayrollView
      officers={officerData}
      paidToday={paidToday}
      totalPaidMap={totalPaidMap}
      todayPaidMap={todayPaidMap}
      totalMax={PAYROLL_TOTAL_MAX}
      dailyMax={PAYROLL_DAILY_MAX}
    />
  )
}
