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
  income: number    // 총 수입 = price * count
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
  if (me.company_id) {
    const { data: co } = await admin.from('companies').select('display_name').eq('id', me.company_id).maybeSingle()
    companyName = co?.display_name ?? null
    const { data: prods } = await admin
      .from('products').select('name, price, sold').eq('company_id', me.company_id).order('created_at')
    for (const p of prods ?? []) {
      sales.push({ product: p.name, price: p.price, count: p.sold, income: (p.price ?? 0) * (p.sold ?? 0) })
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
      savedValues={savedValues}
      submitted={submitted}
      initialActiveTab={cls.reflection_active_tab ?? null}
    />
  )
}
