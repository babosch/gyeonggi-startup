import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CEO가 제출(submitted)한 품의서를 교사 결재 전에 회수한다 → draft 로 되돌려 수정 가능.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { reqId } = await req.json()
  const { data: existing } = await supabase.from('requisitions')
    .select('company_id, status').eq('id', reqId).single()
  if (!existing || existing.company_id !== ceo.company_id) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }
  // 결재 대기(submitted)만 회수 가능
  if (existing.status !== 'submitted') return NextResponse.json({ error: 'not_retractable' }, { status: 400 })

  const { data: updated, error } = await supabase.from('requisitions')
    .update({ status: 'draft' }).eq('id', reqId).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'update_blocked' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
