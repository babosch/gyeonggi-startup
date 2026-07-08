import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SalesView from './SalesView'

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (me?.role !== 'ceo' || !me.company_id) redirect('/company')

  const admin = createAdminClient()

  const { data: acct } = await admin.from('accounts')
    .select('id').eq('owner_type', 'company').eq('owner_id', me.company_id).maybeSingle()

  type Sale = { id: string; amount: number; memo: string | null; created_at: string; buyer: string; refunded: boolean }
  let sales: Sale[] = []

  if (acct?.id) {
    const { data: purchases } = await admin.from('transactions')
      .select('id, amount, memo, created_at, from_account_id')
      .eq('to_account_id', acct.id).eq('type', 'purchase')
      .order('created_at', { ascending: false }).limit(60)
    const p = purchases ?? []

    // 이미 환불된 거래
    const { data: refunds } = await admin.from('transactions')
      .select('idempotency_key').eq('from_account_id', acct.id).eq('type', 'refund')
    const refundedSet = new Set(
      (refunds ?? []).map(r => (r.idempotency_key ?? '').replace('refund:', '')).filter(Boolean)
    )

    // 손님 이름 매핑
    const fromIds = [...new Set(p.map(x => x.from_account_id).filter(Boolean))] as string[]
    const { data: accts } = fromIds.length
      ? await admin.from('accounts').select('id, owner_id').in('id', fromIds)
      : { data: [] }
    const acctToUser: Record<string, string> = Object.fromEntries((accts ?? []).map(a => [a.id, a.owner_id]))
    const userIds = [...new Set(Object.values(acctToUser))]
    const { data: users } = userIds.length
      ? await admin.from('users').select('id, number, nickname').in('id', userIds)
      : { data: [] }
    const userName: Record<string, string> = Object.fromEntries(
      (users ?? []).map(u => [u.id, u.nickname ?? `${u.number}번`])
    )

    sales = p.map(x => ({
      id: x.id,
      amount: x.amount,
      memo: x.memo,
      created_at: x.created_at,
      buyer: x.from_account_id ? (userName[acctToUser[x.from_account_id]] ?? '손님') : '손님',
      refunded: refundedSet.has(x.id),
    }))
  }

  return <SalesView sales={sales} />
}
