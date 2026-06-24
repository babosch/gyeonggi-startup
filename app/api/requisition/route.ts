import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CEO가 품의서를 제출한다 (status submitted). 결재는 교사가 한다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { items, dropped, total, reqId, asDraft } = await req.json()

  // 임시저장은 느슨하게, 제출은 엄격하게 검증
  if (!Array.isArray(items)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  if (!asDraft) {
    if (items.length === 0 || !Number.isInteger(total) || total <= 0) {
      return NextResponse.json({ error: 'invalid' }, { status: 400 })
    }
    // 잔액 확인 (제출 시에만)
    const { data: company } = await supabase.from('companies').select('balance').eq('id', ceo.company_id).single()
    if ((company?.balance ?? 0) < total) return NextResponse.json({ error: 'over_balance' }, { status: 400 })
  }

  const status = asDraft ? 'draft' : 'submitted'
  const payload = {
    company_id: ceo.company_id, items, dropped_items: dropped ?? [],
    total: Number.isInteger(total) ? total : 0, status,
  }

  if (reqId) {
    // 기존 임시저장 수정 — 본인 회사의 draft 만 수정 가능
    const { data: existing } = await supabase.from('requisitions')
      .select('company_id, status').eq('id', reqId).single()
    if (!existing || existing.company_id !== ceo.company_id) {
      return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
    }
    if (existing.status !== 'draft') return NextResponse.json({ error: 'not_editable' }, { status: 400 })
    const { data: updated, error } = await supabase.from('requisitions')
      .update({ ...payload, feedback: asDraft ? undefined : null }).eq('id', reqId).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // RLS 등으로 0건 수정 시 조용한 실패 방지
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'update_blocked' }, { status: 403 })
  } else {
    const { error } = await supabase.from('requisitions').insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
