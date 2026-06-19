import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import LedgerView from './LedgerView'
import type { Stage } from '@/lib/types'

const TYPE_LABEL: Record<string, string> = {
  grant: '지원금', purchase: '구입', payroll: '급여',
  facility: '시설료', exchange: '교류', refund: '환불', adjust: '보정',
}

export default async function LedgerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('ledger')) return <ActivityLocked activityKey="ledger" />

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'officer' && me.role !== 'mayor') {
    return <LedgerView stage={cls.stage} notAllowed rows={[]} />
  }

  // 같은 반 계좌 id 수집 → 거래 조회
  const { data: companies } = await supabase.from('companies').select('id').eq('class_id', me.class_id)
  const companyIds = (companies ?? []).map(c => c.id)
  const { data: accts } = await supabase.from('accounts').select('id, owner_type, owner_id')
  const relevant = (accts ?? []).filter(a =>
    (a.owner_type === 'company' && companyIds.includes(a.owner_id)) ||
    (a.owner_type === 'city' && a.owner_id === me.class_id)
  ).map(a => a.id)

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, type, memo, created_at, from_account_id, to_account_id')
    .or(`from_account_id.in.(${relevant.join(',') || 'none'}),to_account_id.in.(${relevant.join(',') || 'none'})`)
    .order('created_at', { ascending: false }).limit(50)

  const rows = (txs ?? []).map(t => ({
    type: TYPE_LABEL[t.type] ?? t.type, amount: t.amount, memo: t.memo, created_at: t.created_at,
  }))

  return <LedgerView stage={cls.stage} rows={rows} />
}
