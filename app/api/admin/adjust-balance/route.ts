import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transfer, syncCompanyBalance } from '@/lib/ledger'

// 교사가 학생/회사 잔액을 수동으로 조정
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { ownerType, ownerId, amount, memo } = await req.json()
  // amount > 0: 지급, amount < 0: 차감
  if (!ownerType || !ownerId || !amount || amount === 0) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (amount > 0) {
    // 지급: gov → target
    const result = await transfer({
      admin,
      fromType: 'gov', fromId: null,
      toType: ownerType, toId: ownerId,
      amount: Math.abs(amount),
      type: 'adjust',
      memo: memo ?? '교사 수동 지급',
      idempotencyKey: `adjust-${ownerId}-${Date.now()}`,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  } else {
    // 차감: target → gov (잔액 초과 시 잔액만큼 차감)
    const { data: acct } = await admin
      .from('accounts').select('balance')
      .eq('owner_type', ownerType).eq('owner_id', ownerId).single()
    const deduct = Math.min(Math.abs(amount), acct?.balance ?? 0)
    if (deduct === 0) return NextResponse.json({ ok: true, note: 'already_zero' })
    const result = await transfer({
      admin,
      fromType: ownerType, fromId: ownerId,
      toType: 'gov', toId: null,
      amount: deduct,
      type: 'adjust',
      memo: memo ?? '교사 수동 차감',
      idempotencyKey: `adjust-${ownerId}-${Date.now()}`,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (ownerType === 'company') await syncCompanyBalance(admin, ownerId)
  return NextResponse.json({ ok: true })
}
