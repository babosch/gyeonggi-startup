import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'

// 공무원·시장이 시설 사용 신청을 승인/반려/취소한다.
//  - 승인: 승인 시점 시설 가격으로 회사 계좌 → 시청 계좌 과금(멱등) + status=approved
//  - 반려: 과금 없이 status=rejected + 사유
//  - 취소: 잘못 승인한 건을 환불(시청 → 회사) + status=pending 으로 되돌림
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!caller || !['officer', 'mayor'].includes(caller.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { facilityUseId, action, feedback } = await req.json() // action: 'approve' | 'reject' | 'cancel'
  const admin = createAdminClient()

  const { data: fu } = await admin.from('facility_uses')
    .select('id, facility_id, company_id, quantity, total_amount, status').eq('id', facilityUseId).single()
  if (!fu) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: facility } = await admin.from('facilities')
    .select('class_id, price, name').eq('id', fu.facility_id).single()
  if (!facility || facility.class_id !== caller.class_id) {
    return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  }

  if (action === 'reject') {
    if (fu.status !== 'pending') return NextResponse.json({ ok: true })
    await admin.from('facility_uses')
      .update({ status: 'rejected', feedback: (feedback ?? '').toString().slice(0, 500) || null })
      .eq('id', facilityUseId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve') {
    if (fu.status === 'approved') return NextResponse.json({ ok: true }) // 멱등
    if (fu.status !== 'pending') return NextResponse.json({ error: 'not_pending' }, { status: 400 })

    const total = facility.price * fu.quantity
    const result = await transfer({
      admin, fromType: 'company', fromId: fu.company_id, toType: 'city', toId: facility.class_id,
      amount: total, type: 'facility', memo: `${facility.name} ${fu.quantity}회 (승인)`,
      facilityId: fu.facility_id, idempotencyKey: `facility-use:${fu.id}`,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    await admin.from('facility_uses')
      .update({ status: 'approved', total_amount: total }).eq('id', facilityUseId)
    await syncCompanyBalance(admin, fu.company_id)
    return NextResponse.json({ ok: true, total })
  }

  if (action === 'cancel') {
    // 잘못 승인한 건 취소 → 환불(시청 → 회사) + 다시 대기 상태로
    if (fu.status !== 'approved') return NextResponse.json({ error: 'not_approved' }, { status: 400 })
    const refund = fu.total_amount
    if (Number.isInteger(refund) && refund > 0) {
      const result = await transfer({
        admin, fromType: 'city', fromId: facility.class_id, toType: 'company', toId: fu.company_id,
        amount: refund, type: 'refund', memo: `${facility.name} 승인 취소 환불`,
        facilityId: fu.facility_id, idempotencyKey: `facility-use-refund:${fu.id}`,
      })
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    }
    await admin.from('facility_uses').update({ status: 'pending' }).eq('id', facilityUseId)
    await syncCompanyBalance(admin, fu.company_id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'bad_action' }, { status: 400 })
}
