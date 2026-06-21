import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'officer' || !me.class_id) {
    return NextResponse.json({ error: 'officer_only' }, { status: 403 })
  }

  const body = await req.json()
  const { fromCompanyId, toCityName, toCompanyName, giveText, receivedText, notes } = body

  if (!fromCompanyId || !toCityName?.trim() || !toCompanyName?.trim() || !giveText?.trim() || !receivedText?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // 해당 회사가 같은 반 소속인지 검증
  const admin = createAdminClient()
  const { data: co } = await admin.from('companies').select('id, class_id').eq('id', fromCompanyId).single()
  if (!co || co.class_id !== me.class_id) {
    return NextResponse.json({ error: 'invalid_company' }, { status: 400 })
  }

  const { data, error } = await admin.from('exchange_logs').insert({
    class_id: me.class_id,
    from_company_id: fromCompanyId,
    to_city_name: toCityName.trim().slice(0, 50),
    to_company_name: toCompanyName.trim().slice(0, 100),
    give_text: giveText.trim().slice(0, 200),
    received_text: receivedText.trim().slice(0, 200),
    officer_id: user.id,
    notes: notes?.trim().slice(0, 500) || null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, id: data.id })
}
