import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OfficerPayrollView from './OfficerPayrollView'

export default async function OfficerPayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/home')

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

  const officerData = (officers ?? []).map(o => ({
    id: o.id,
    number: o.number,
    nickname: o.nickname,
    worklog: latestLogMap[o.id] ?? null,
  }))

  return <OfficerPayrollView officers={officerData} paidToday={paidToday} />
}
