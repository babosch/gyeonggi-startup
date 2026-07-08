import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { content, reserve, planId, version, asDraft } = await req.json()

  // 입력 검증 — 임시저장은 회사 이름만 있으면 OK, 제출은 필수
  if (typeof reserve !== 'number' || reserve < 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }
  if (!asDraft && !content?.companyName) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const { data: me } = await supabase.from('users').select('class_id, role').eq('id', user.id).single()
  if (!me) return NextResponse.json({ error: 'no_user' }, { status: 404 })

  const nextStatus = asDraft ? 'draft' : 'submitted'

  if (planId) {
    // 수정 — 선정된 계획서는 수정 불가. 제출 대기(submitted)도 회수 전엔 수정 불가.
    const { data: existing } = await supabase.from('business_plans').select('status').eq('id', planId).single()
    if (existing?.status === 'selected') return NextResponse.json({ error: 'already_selected' }, { status: 400 })
    if (existing?.status === 'submitted') return NextResponse.json({ error: 'pending_review' }, { status: 400 })
    const { error } = await supabase.from('business_plans')
      .update({
        content, reserve_amount: reserve, status: nextStatus,
        version: (version ?? 0) + 1,
        // 다시 제출하면 이전 반려 피드백은 지움
        feedback: asDraft ? undefined : null,
        submitted_at: asDraft ? undefined : new Date().toISOString(),
      })
      .eq('id', planId).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('business_plans').insert({
      user_id: user.id, class_id: me.class_id, content, reserve_amount: reserve,
      status: nextStatus, version: 0,
      submitted_at: asDraft ? null : new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
