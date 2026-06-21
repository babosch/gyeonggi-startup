import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'officer') return NextResponse.json({ error: 'only_officer' }, { status: 403 })

  const { companyId, itemName, detail } = await req.json()
  if (!itemName?.trim() || !detail?.trim()) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { error } = await supabase.from('trade_reports').insert({
    class_id: me.class_id, officer_id: user.id,
    company_id: companyId || null,
    item_name: itemName.trim(), detail: detail.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 교사가 처리 상태 변경
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'only_mayor' }, { status: 403 })

  const { reportId, status, mayorNote } = await req.json()
  const { error } = await supabase.from('trade_reports')
    .update({ status, mayor_note: mayorNote ?? null })
    .eq('id', reportId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
