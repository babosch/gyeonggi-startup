import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'

// CEO가 공용 시설을 이용한다. 회사 계좌 → 시청 계좌 이체.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { facilityId, quantity, memo } = await req.json()
  if (!Number.isInteger(quantity) || quantity <= 0) return NextResponse.json({ error: 'invalid_qty' }, { status: 400 })

  const admin = createAdminClient()
  const { data: facility } = await admin.from('facilities').select('price, class_id, name').eq('id', facilityId).single()
  if (!facility || facility.class_id !== ceo.class_id) return NextResponse.json({ error: 'invalid_facility' }, { status: 400 })

  const total = facility.price * quantity

  const result = await transfer({
    admin, fromType: 'company', fromId: ceo.company_id, toType: 'city', toId: ceo.class_id,
    amount: total, type: 'facility', memo: `${facility.name} ${quantity}회`, facilityId,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await admin.from('facility_uses').insert({
    facility_id: facilityId, company_id: ceo.company_id, memo, quantity, total_amount: total,
  })
  await syncCompanyBalance(admin, ceo.company_id)

  return NextResponse.json({ ok: true })
}
