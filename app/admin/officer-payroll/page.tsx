import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OfficerPayrollView from './OfficerPayrollView'
import { PAYROLL_TOTAL_MAX, OFFICER_PAYROLL_DAILY_MAX } from '@/lib/constants'

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

  const paidToday = officerIds.filter(id => todayPaidMap[id] >= OFFICER_PAYROLL_DAILY_MAX)

  // 업무일지 (오늘뿐 아니라 지난 일지까지 — 미지급분 지급 가능하게). 최신순.
  const { data: logs } = officerIds.length > 0
    ? await supabase.from('activity_logs')
        .select('id, user_id, payload, status, feedback, created_at')
        .in('user_id', officerIds).eq('action', 'worklog')
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] }

  const worklogsMap: Record<string, { id: string; text: string; status: string; feedback: string | null; created_at: string }[]> = {}
  for (const log of logs ?? []) {
    ;(worklogsMap[log.user_id] ??= []).push({
      id: log.id, text: (log.payload as { text?: string })?.text ?? '',
      status: (log.status as string) ?? 'submitted',
      feedback: (log.feedback as string | null) ?? null, created_at: log.created_at,
    })
  }

  const officerData = (officers ?? []).map(o => ({
    id: o.id, number: o.number, nickname: o.nickname,
    worklogs: worklogsMap[o.id] ?? [],
  }))

  return (
    <OfficerPayrollView
      officers={officerData}
      paidToday={paidToday}
      totalPaidMap={totalPaidMap}
      todayPaidMap={todayPaidMap}
      totalMax={PAYROLL_TOTAL_MAX}
      dailyMax={OFFICER_PAYROLL_DAILY_MAX}
    />
  )
}
