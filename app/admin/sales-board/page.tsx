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

  // 초기 순 판매액 = 회사로 들어온 구매(purchase) 합계 - 회사가 돌려준 환불(refund) 합계
  const acctIds = (accounts ?? []).map(a => a.id)
  const revByAcct: Record<string, number> = {}
  if (acctIds.length) {
    // 매출: 회사 계좌로 들어온 purchase
    const { data: sales } = await admin
      .from('transactions').select('to_account_id, amount')
      .in('to_account_id', acctIds).eq('type', 'purchase').eq('voided', false)
    for (const t of sales ?? []) {
      revByAcct[t.to_account_id] = (revByAcct[t.to_account_id] ?? 0) + (t.amount ?? 0)
    }
    // 환불: 회사 계좌에서 손님에게 되돌려준 refund (판매 취소) → 판매액에서 차감
    // (시설 사용료 환불 등은 from=회사가 아니므로 자동 제외됨)
    const { data: refunds } = await admin
      .from('transactions').select('from_account_id, amount')
      .in('from_account_id', acctIds).eq('type', 'refund').eq('voided', false)
    for (const t of refunds ?? []) {
      revByAcct[t.from_account_id] = (revByAcct[t.from_account_id] ?? 0) - (t.amount ?? 0)
    }
  }

  // 지원금: 회사 계좌로 들어온 grant 합계
  const grantByAcct: Record<string, number> = {}
  if (acctIds.length) {
    const { data: grants } = await admin
      .from('transactions').select('to_account_id, amount')
      .in('to_account_id', acctIds).eq('type', 'grant').eq('voided', false)
    for (const t of grants ?? []) {
      grantByAcct[t.to_account_id] = (grantByAcct[t.to_account_id] ?? 0) + (t.amount ?? 0)
    }
  }

  // 재료비: 승인된 품의서 합계 (회사별)
  const materialByCompany: Record<string, number> = {}
  if (companyList.length) {
    const { data: reqs } = await admin
      .from('requisitions').select('company_id, total')
      .in('company_id', companyList.map(c => c.id)).eq('status', 'approved')
    for (const r of reqs ?? []) {
      materialByCompany[r.company_id] = (materialByCompany[r.company_id] ?? 0) + (r.total ?? 0)
    }
  }

  const initialCompanies = companyList.map(c => {
    const acct = acctByCompany[c.id] ?? null
    const revenue = acct ? (revByAcct[acct] ?? 0) : 0
    const grant = acct ? (grantByAcct[acct] ?? 0) : 0
    const material = materialByCompany[c.id] ?? 0
    return {
      id: c.id,
      name: c.display_name,
      icon: c.icon,
      acctId: acct,
      revenue,
      grant,
      material,
      profit: revenue - material,   // 실제 이익 = 매출 − 재료비
    }
  })

  return (
    <SalesBoardView
      cityName={cls.name}
      classId={me.class_id!}
      initialCompanies={initialCompanies}
    />
  )
}
