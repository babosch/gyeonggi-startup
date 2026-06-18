import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PayrollList from './PayrollList'
import type { Stage } from '@/lib/types'

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, company_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'ceo' || !me.company_id) {
    return <PayrollList stage={cls.stage} notCeo members={[]} balance={0} paidToday={[]} />
  }

  const { data: company } = await supabase.from('companies').select('balance').eq('id', me.company_id).single()
  const { data: members } = await supabase
    .from('users').select('id, number, nickname, role').eq('company_id', me.company_id).order('role').order('number')

  // 오늘 지급된 대상
  const today = new Date().toISOString().slice(0, 10)
  const { data: paid } = await supabase
    .from('transactions').select('idempotency_key').like('idempotency_key', `payroll:%:${today}`)
  const paidToday = (paid ?? []).map(p => p.idempotency_key?.split(':')[1]).filter(Boolean) as string[]

  return (
    <PayrollList stage={cls.stage} members={members ?? []} balance={company?.balance ?? 0} paidToday={paidToday} />
  )
}
