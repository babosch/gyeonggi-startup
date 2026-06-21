import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import PayrollList from './PayrollList'
import type { Stage } from '@/lib/types'

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
    return <PayrollList stage={cls.stage} notCeo members={[]} paidToday={[]} />
  }

  const { data: members } = await supabase
    .from('users').select('id, number, nickname, role').eq('company_id', me.company_id).order('role').order('number')

  // 오늘 지급된 대상
  const today = new Date().toISOString().slice(0, 10)
  const { data: paid } = await supabase
    .from('transactions').select('idempotency_key').like('idempotency_key', `payroll:%:${today}`)
  const paidToday = (paid ?? []).map(p => p.idempotency_key?.split(':')[1]).filter(Boolean) as string[]

  // 각 직원의 최근 업무일지 (최대 1개씩)
  const memberIds = (members ?? []).map(m => m.id)
  const { data: logs } = memberIds.length > 0
    ? await supabase.from('activity_logs').select('user_id, payload, created_at')
        .in('user_id', memberIds).eq('action', 'worklog')
        .order('created_at', { ascending: false }).limit(memberIds.length * 3)
    : { data: [] }

  // user_id별 마지막 로그 추출
  const latestLogMap: Record<string, { text: string; created_at: string }> = {}
  for (const log of logs ?? []) {
    if (!latestLogMap[log.user_id]) {
      latestLogMap[log.user_id] = { text: log.payload?.text ?? '', created_at: log.created_at }
    }
  }

  return (
    <PayrollList stage={cls.stage} members={members ?? []}
      paidToday={paidToday} latestLogMap={latestLogMap} />
  )
}
