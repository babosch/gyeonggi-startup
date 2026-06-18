import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// CEO가 품의서를 제출한다 (status submitted). 결재는 교사가 한다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { items, dropped, total } = await req.json()
  if (!Array.isArray(items) || items.length === 0 || !Number.isInteger(total) || total <= 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // 잔액 확인
  const { data: company } = await supabase.from('companies').select('balance').eq('id', ceo.company_id).single()
  if ((company?.balance ?? 0) < total) return NextResponse.json({ error: 'over_balance' }, { status: 400 })

  const { error } = await supabase.from('requisitions').insert({
    company_id: ceo.company_id, items, dropped_items: dropped ?? [], total, status: 'submitted',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
