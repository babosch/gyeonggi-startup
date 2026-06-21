import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FlowView from './FlowView'

export default async function FlowPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, company_id').eq('id', user.id).single()
  if (!me || me.role !== 'ceo' || !me.company_id) redirect('/company')

  const { data: company } = await supabase
    .from('companies').select('id, display_name, icon, balance').eq('id', me.company_id).single()

  const admin = createAdminClient()

  const { data: acct } = await admin
    .from('accounts').select('id')
    .eq('owner_type', 'company').eq('owner_id', me.company_id).maybeSingle()

  type TxRow = {
    id: string; amount: number; type: string; memo: string | null
    created_at: string; from_account_id: string | null; to_account_id: string | null
  }
  let transactions: TxRow[] = []

  if (acct?.id) {
    const { data: txs } = await admin
      .from('transactions')
      .select('id, amount, type, memo, created_at, from_account_id, to_account_id')
      .or(`from_account_id.eq.${acct.id},to_account_id.eq.${acct.id}`)
      .eq('voided', false)
      .order('created_at', { ascending: false })
      .limit(200)
    transactions = (txs ?? []) as TxRow[]
  }

  return (
    <FlowView
      company={company ?? null}
      transactions={transactions}
      companyAcctId={acct?.id ?? null}
    />
  )
}
