import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OfficerPayrollView from './OfficerPayrollView'
import { STAGE_PAYROLL_MAX } from '@/lib/constants'

export default async function OfficerPayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(stage)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: number } | null
  const stage = cls?.stage ?? 2

  // 공무원 목록
  const { data: officers } = await supabase
    .from('users').select('id, number, nickname')
    .eq('class_id', me.class_id!).eq('role', 'officer')
    .order('number')

  const officerIds = (officers ?? []).map(o => o.id)

  // 공무원 업무일지
  const { data: logs } = officerIds.length > 0
    ? await supabase.from('activity_logs')
        .select('user_id, payload, created_at')
        .in('user_id', officerIds).eq('action', 'worklog')
        .order('created_at', { ascending: false }).limit(officerIds.length * 3)
    : { data: [] }

  const latestLogMap: Record<string, { text: string; created_at: string }> = {}
  for (const log of logs ?? []) {
    if (!latestLogMap[log.user_id]) {
      latestLogMap[log.user_id] = { text: log.payload?.text ?? '', created_at: log.created_at }
    }
  }

  // 오늘 이미 지급된 공무원
  const today = new Date().toISOString().slice(0, 10)
  const { data: paid } = await supabase
    .from('transactions').select('idempotency_key')
    .like('idempotency_key', `officer-payroll:%:${today}`)
  const paidToday = (paid ?? [])
    .map(p => p.idempotency_key?.split(':')[1]).filter(Boolean) as string[]

  // 이번 단계에서 각 공무원에게 지급한 횟수
  const { data: stagePaidRows } = await supabase
    .from('transactions')
    .select('idempotency_key')
    .like('idempotency_key', `officer-payroll:%:${stage}:%`)

  const stagePaidCountMap: Record<string, number> = {}
  for (const row of stagePaidRows ?? []) {
    const parts = row.idempotency_key?.split(':')
    // format: officer-payroll:{userId}:{stage}:{date}
    if (parts?.length >= 4 && parts[2] === String(stage)) {
      const userId = parts[1]
      stagePaidCountMap[userId] = (stagePaidCountMap[userId] ?? 0) + 1
    }
  }

  const officerData = (officers ?? []).map(o => ({
    id: o.id,
    number: o.number,
    nickname: o.nickname,
    worklog: latestLogMap[o.id] ?? null,
  }))

  return (
    <OfficerPayrollView
      officers={officerData}
      paidToday={paidToday}
      stagePaidCountMap={stagePaidCountMap}
      stageMax={STAGE_PAYROLL_MAX[stage]}
    />
  )
}
