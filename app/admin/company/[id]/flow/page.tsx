import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FlowView from '@/app/company/flow/FlowView'

export default async function AdminCompanyFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: company } = await supabase
    .from('companies').select('id, display_name, icon, balance, class_id').eq('id', id).single()
  if (!company || company.class_id !== me.class_id) redirect('/admin/monitor')

  const admin = createAdminClient()
  const { data: acct } = await admin
    .from('accounts').select('id')
    .eq('owner_type', 'company').eq('owner_id', company.id).maybeSingle()

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
      company={{ id: company.id, display_name: company.display_name, icon: company.icon, balance: company.balance }}
      transactions={transactions}
      companyAcctId={acct?.id ?? null}
      backHref="/admin/monitor"
      backLabel="← 종합 모니터링"
    />
  )
}
