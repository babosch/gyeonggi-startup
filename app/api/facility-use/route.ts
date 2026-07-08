import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// CEO가 공용 시설 사용을 '신청'한다 (status=pending). 실제 과금은 공무원·시장 승인 시에.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { facilityId, quantity, memo } = await req.json()
  if (!Number.isInteger(quantity) || quantity <= 0) return NextResponse.json({ error: 'invalid_qty' }, { status: 400 })

  const admin = createAdminClient()
  const { data: facility } = await admin.from('facilities').select('price, class_id').eq('id', facilityId).single()
  if (!facility || facility.class_id !== ceo.class_id) return NextResponse.json({ error: 'invalid_facility' }, { status: 400 })

  // 예상 금액(표시용). 실제 과금은 승인 시점의 시설 가격으로 다시 계산한다.
  const total = facility.price * quantity

  const { error } = await admin.from('facility_uses').insert({
    facility_id: facilityId, company_id: ceo.company_id, created_by: user.id,
    memo: (memo ?? '').toString().slice(0, 100), quantity, total_amount: total, status: 'pending',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
