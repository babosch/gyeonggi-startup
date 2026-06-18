import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'
import { GRANT_AMOUNT, SPECIALTY_BONUS, MAX_COMPANIES_PER_CLASS } from '@/lib/constants'

// 교사가 사업계획서를 선정/취소한다.
// 선정: 회사 생성 + 회사 계좌 + 지원금(멱등) + CEO 전직(reveal_pending)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { planId, action, grantBonus } = await req.json() // action: 'select' | 'cancel'
  const admin = createAdminClient()

  const { data: plan } = await admin.from('business_plans')
    .select('id, user_id, class_id, content, status').eq('id', planId).single()
  if (!plan) return NextResponse.json({ error: 'plan_not_found' }, { status: 404 })
  if (plan.class_id !== mayor.class_id) return NextResponse.json({ error: 'wrong_class' }, { status: 403 })

  if (action === 'select') {
    // 정원 확인
    const { count } = await admin.from('companies')
      .select('id', { count: 'exact', head: true }).eq('class_id', plan.class_id)
    if ((count ?? 0) >= MAX_COMPANIES_PER_CLASS) {
      return NextResponse.json({ error: 'company_limit' }, { status: 400 })
    }
    if (plan.status === 'selected') return NextResponse.json({ ok: true }) // 멱등

    const companyName = plan.content?.companyName ?? '새 회사'

    // 회사 생성
    const { data: company, error: cErr } = await admin.from('companies')
      .insert({ class_id: plan.class_id, display_name: companyName, balance: 0, grant_given: false })
      .select('id').single()
    if (cErr || !company) return NextResponse.json({ error: cErr?.message }, { status: 500 })

    // 회사 계좌
    await admin.from('accounts').upsert(
      { owner_type: 'company', owner_id: company.id, balance: 0 },
      { onConflict: 'owner_type,owner_id' })

    // 지원금 지급 (멱등 — grant_given 플래그 + 멱등키)
    const amount = GRANT_AMOUNT + (grantBonus ? SPECIALTY_BONUS : 0)
    const result = await transfer({
      admin, fromType: 'gov', fromId: null, toType: 'company', toId: company.id,
      amount, type: 'grant', memo: '창업 지원금',
      idempotencyKey: `grant-${company.id}`,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
    await admin.from('companies').update({ grant_given: true }).eq('id', company.id)
    await syncCompanyBalance(admin, company.id)

    // CEO 전직 (reveal_pending → 다음 로그인 팝업)
    await admin.from('users').update({
      role: 'ceo', company_id: company.id, reveal_pending: 'ceo',
    }).eq('id', plan.user_id)

    await admin.from('business_plans').update({
      status: 'selected', selected_at: new Date().toISOString(),
    }).eq('id', planId)

    return NextResponse.json({ ok: true, companyId: company.id })
  }

  if (action === 'cancel') {
    // 선정 취소: 회사·계좌·지원금 회수, 지원자로 복귀
    const { data: ceo } = await admin.from('users').select('id, company_id').eq('id', plan.user_id).single()
    if (ceo?.company_id) {
      await admin.from('accounts').delete().eq('owner_type', 'company').eq('owner_id', ceo.company_id)
      await admin.from('companies').delete().eq('id', ceo.company_id)
    }
    await admin.from('users').update({ role: 'applicant', company_id: null, reveal_pending: null }).eq('id', plan.user_id)
    await admin.from('business_plans').update({ status: 'submitted', selected_at: null }).eq('id', planId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'bad_action' }, { status: 400 })
}
