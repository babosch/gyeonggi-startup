import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import ReflectionView from './ReflectionView'
import type { Stage } from '@/lib/types'
import type { ReflectionTabId } from '@/lib/reflection'

export interface PurchaseRow {
  transaction_id: string
  product: string   // 단일구매면 상품명, 여러 개면 "여러 개 구매"
  price: number
  place: string     // 산 곳(기업명)
  multi: boolean
}
export interface SalesRow {
  product: string
  price: number
  count: number     // 판매 개수(products.sold)
  income: number    // 총 판매액 = price * count
}
export interface CompanyExpenses {
  material: number  // 재료비 (승인된 품의서 합계)
  facility: number  // 시설이용비 (승인된 시설 사용 합계)
}

export default async function ReflectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('reflection')) return <ActivityLocked activityKey="reflection" />

  const { data: me } = await supabase
    .from('users').select('number, nickname, role, company_id, class_id, classes(name, color, stage, reflection_active_tab)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string; color: string; stage: Stage; reflection_active_tab: ReflectionTabId | null }

  const admin = createAdminClient()

  // 재료비(승인 품의서) + 시설이용비(승인 시설사용) 실제 합계 — 회사별
  async function fetchExpenses(companyIds: string[]): Promise<Record<string, CompanyExpenses>> {
    const result: Record<string, CompanyExpenses> = {}
    if (!companyIds.length) return result
    const { data: reqs } = await admin
      .from('requisitions').select('company_id, total').in('company_id', companyIds).eq('status', 'approved')
    for (const r of reqs ?? []) {
      if (!result[r.company_id]) result[r.company_id] = { material: 0, facility: 0 }
      result[r.company_id].material += r.total ?? 0
    }
    const { data: facs } = await admin
      .from('facility_uses').select('company_id, total_amount').in('company_id', companyIds).eq('status', 'approved')
    for (const f of facs ?? []) {
      if (!result[f.company_id]) result[f.company_id] = { material: 0, facility: 0 }
      result[f.company_id].facility += f.total_amount ?? 0
    }
    return result
  }

  // 내 계좌
  const { data: myAcct } = await admin
    .from('accounts').select('id, balance').eq('owner_type', 'user').eq('owner_id', user.id).maybeSingle()

  // ── 소비자: 내 구매 내역 자동 불러오기 ──
  const purchases: PurchaseRow[] = []
  let totalSpent = 0
  let balance = myAcct?.balance ?? 0
  if (myAcct?.id) {
    const { data: txs } = await admin
      .from('transactions')
      .select('id, amount, memo, type, from_account_id, to_account_id, created_at')
      .eq('from_account_id', myAcct.id).eq('type', 'purchase').eq('voided', false)
      .order('created_at')
    // 상대(회사) 계좌 → 회사명 매핑
    const toAcctIds = [...new Set((txs ?? []).map(t => t.to_account_id).filter(Boolean))] as string[]
    const { data: coAccts } = toAcctIds.length
      ? await admin.from('accounts').select('id, owner_id').eq('owner_type', 'company').in('id', toAcctIds)
      : { data: [] as { id: string; owner_id: string }[] }
    const companyIdByAcct: Record<string, string> = Object.fromEntries((coAccts ?? []).map(a => [a.id, a.owner_id]))
    const companyIds = [...new Set(Object.values(companyIdByAcct))]
    const { data: cos } = companyIds.length
      ? await admin.from('companies').select('id, display_name').in('id', companyIds)
      : { data: [] as { id: string; display_name: string }[] }
    const nameByCompany: Record<string, string> = Object.fromEntries((cos ?? []).map(c => [c.id, c.display_name]))

    for (const t of txs ?? []) {
      totalSpent += t.amount ?? 0
      const isMulti = /^\d+개 상품 구매$/.test(t.memo ?? '')
      const companyId = t.to_account_id ? companyIdByAcct[t.to_account_id] : undefined
      purchases.push({
        transaction_id: t.id,
        product: isMulti ? '여러 개 구매' : (t.memo ?? ''),
        price: t.amount ?? 0,
        place: companyId ? (nameByCompany[companyId] ?? '') : '',
        multi: isMulti,
      })
    }
  }
  // 처음 가진 금액 = 남은 금액 + 총 사용 (이 반은 초기 용돈이 없고 급여로 벌어서 씀)
  const totalHad = balance + totalSpent

  // ── 생산: 내 회사 판매 내역 자동 불러오기 ──
  const sales: SalesRow[] = []
  let companyName: string | null = null
  let expenses: CompanyExpenses | null = null
  if (me.company_id) {
    const { data: co } = await admin.from('companies').select('display_name').eq('id', me.company_id).maybeSingle()
    companyName = co?.display_name ?? null
    const { data: prods } = await admin
      .from('products').select('name, price, sold').eq('company_id', me.company_id).order('created_at')
    for (const p of prods ?? []) {
      sales.push({ product: p.name, price: p.price, count: p.sold, income: (p.price ?? 0) * (p.sold ?? 0) })
    }
    const expMap = await fetchExpenses([me.company_id])
    expenses = expMap[me.company_id] ?? { material: 0, facility: 0 }
  }

  // ── 회사가 없는 학생(공무원 등): 본인이 시찰 보고서를 쓴 회사들 중 자유 선택 ──
  const inspectedCompanies: { id: string; name: string }[] = []
  const salesByCompany: Record<string, SalesRow[]> = {}
  const expensesByCompany: Record<string, CompanyExpenses> = {}
  if (!me.company_id) {
    const { data: inspections } = await admin
      .from('inspection_reports').select('company_id').eq('officer_id', user.id).eq('class_id', me.class_id!)
    const companyIds = [...new Set((inspections ?? []).map(r => r.company_id).filter(Boolean))] as string[]
    if (companyIds.length) {
      const { data: cos } = await admin.from('companies').select('id, display_name').in('id', companyIds)
      for (const c of cos ?? []) inspectedCompanies.push({ id: c.id, name: c.display_name })
      const { data: prods } = await admin
        .from('products').select('company_id, name, price, sold').in('company_id', companyIds).order('created_at')
      for (const p of prods ?? []) {
        if (!salesByCompany[p.company_id]) salesByCompany[p.company_id] = []
        salesByCompany[p.company_id].push({ product: p.name, price: p.price, count: p.sold, income: (p.price ?? 0) * (p.sold ?? 0) })
      }
      const expMap = await fetchExpenses(companyIds)
      for (const id of companyIds) expensesByCompany[id] = expMap[id] ?? { material: 0, facility: 0 }
    }
  }

  // ── 저장된 응답 + 탭 제출 상태 ──
  const { data: responses } = await supabase
    .from('reflection_responses').select('tab_id, field_id, value').eq('user_id', user.id)
  const savedValues: Record<string, unknown> = {}
  for (const r of responses ?? []) savedValues[`${r.tab_id}:${r.field_id}`] = r.value

  const { data: statusRows } = await supabase
    .from('reflection_tab_status').select('tab_id, submitted').eq('user_id', user.id)
  const submitted: Record<string, boolean> = {}
  for (const s of statusRows ?? []) submitted[s.tab_id] = s.submitted

  return (
    <ReflectionView
      userId={user.id}
      classId={me.class_id!}
      cityName={cls.name}
      color={cls.color}
      number={me.number}
      nickname={me.nickname}
      companyName={companyName}
      purchases={purchases}
      totals={{ totalHad, totalSpent, balance }}
      sales={sales}
      expenses={expenses}
      inspectedCompanies={inspectedCompanies}
      salesByCompany={salesByCompany}
      expensesByCompany={expensesByCompany}
      savedValues={savedValues}
      submitted={submitted}
      initialActiveTab={cls.reflection_active_tab ?? null}
    />
  )
}
