import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// CEO가 교류 요청 카드를 등록/수정
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (!me || me.role !== 'ceo' || !me.company_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { offer, want } = await req.json()
  if (!offer?.trim() || !want?.trim()) return NextResponse.json({ error: 'offer_want_required' }, { status: 400 })
  if (offer.length > 100 || want.length > 100) return NextResponse.json({ error: 'too_long' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('exchange_cards').upsert({
    company_id: me.company_id,
    class_id: me.class_id,
    offer: offer.trim(),
    want: want.trim(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
