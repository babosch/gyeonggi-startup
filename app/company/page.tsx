import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import CompanyManager from './CompanyManager'
import type { Stage } from '@/lib/types'

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('company')) return <ActivityLocked activityKey="company" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'ceo' || !me.company_id) {
    return <CompanyManager stage={cls.stage} company={null} products={[]} stats={null} notCeo />
  }

  const { data: company } = await supabase
    .from('companies').select('id, display_name, icon, balance').eq('id', me.company_id).single()
  const { data: products } = await supabase
    .from('products').select('*').eq('company_id', me.company_id).order('created_at')

  // 회사 계좌 ID 조회
  const { data: companyAcct } = await supabase
    .from('accounts').select('id')
    .eq('owner_type', 'company').eq('owner_id', me.company_id).maybeSingle()

  let revenue = 0
  let grantTotal = 0
  if (companyAcct?.id) {
    // 매출 (purchase: 고객이 회사에 결제)
    const { data: sales } = await supabase
      .from('transactions').select('amount')
      .eq('to_account_id', companyAcct.id).eq('type', 'purchase').eq('voided', false)
    revenue = (sales ?? []).reduce((s, t) => s + (t.amount ?? 0), 0)

    // 지원금
    const { data: grants } = await supabase
      .from('transactions').select('amount')
      .eq('to_account_id', companyAcct.id).eq('type', 'grant').eq('voided', false)
    grantTotal = (grants ?? []).reduce((s, g) => s + (g.amount ?? 0), 0)
  }

  // 재료비: 승인된 품의서 합계
  const { data: reqs } = await supabase
    .from('requisitions').select('total')
    .eq('company_id', me.company_id).eq('status', 'approved')
  const materialCost = (reqs ?? []).reduce((s, r) => s + (r.total ?? 0), 0)

  const stats = {
    balance: company?.balance ?? 0,
    grantTotal,
    materialCost,
    revenue,
    profit: revenue - materialCost,
  }

  return <CompanyManager stage={cls.stage} company={company} products={products ?? []} stats={stats} />
}
