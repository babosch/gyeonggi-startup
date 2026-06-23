import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 학생이 제출(submitted)한 사업계획서를 교사 심사 전에 회수한다 → draft 로 되돌려 수정 가능.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: plan } = await supabase
    .from('business_plans').select('id, status').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  // 제출 대기 상태만 회수 가능 (선정·반려된 것은 불가)
  if (plan.status !== 'submitted') return NextResponse.json({ error: 'not_retractable' }, { status: 400 })

  const { error } = await supabase.from('business_plans')
    .update({ status: 'draft' }).eq('id', plan.id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
