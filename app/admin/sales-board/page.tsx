import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SalesBoardView from './SalesBoardView'

export default async function SalesBoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(name)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string }

  const admin = createAdminClient()

  // 우리 반 회사
  const { data: companies } = await admin
    .from('companies').select('id, display_name, icon')
    .eq('class_id', me.class_id).order('created_at')
  const companyList = companies ?? []

  // 회사 계좌
  const { data: accounts } = await admin
    .from('accounts').select('id, owner_id')
    .eq('owner_type', 'company')
    .in('owner_id', companyList.length ? companyList.map(c => c.id) : ['_'])
  const acctByCompany: Record<string, string> = Object.fromEntries(
    (accounts ?? []).map(a => [a.owner_id, a.id])
  )

  // 초기 판매액 (purchase 거래 합계, 회사 계좌로 들어온 것)
  const acctIds = (accounts ?? []).map(a => a.id)
  const { data: sales } = acctIds.length
    ? await admin
        .from('transactions').select('to_account_id, amount')
        .in('to_account_id', acctIds).eq('type', 'purchase').eq('voided', false)
    : { data: [] as { to_account_id: string; amount: number }[] }

  const revByAcct: Record<string, number> = {}
  for (const t of sales ?? []) {
    revByAcct[t.to_account_id] = (revByAcct[t.to_account_id] ?? 0) + (t.amount ?? 0)
  }

  const initialCompanies = companyList.map(c => ({
    id: c.id,
    name: c.display_name,
    icon: c.icon,
    acctId: acctByCompany[c.id] ?? null,
    revenue: acctByCompany[c.id] ? (revByAcct[acctByCompany[c.id]] ?? 0) : 0,
  }))

  return (
    <SalesBoardView
      cityName={cls.name}
      classId={me.class_id!}
      initialCompanies={initialCompanies}
    />
  )
}
