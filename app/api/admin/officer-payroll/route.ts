import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transfer } from '@/lib/ledger'
import { WAGE } from '@/lib/constants'

// 교사(시장)가 공무원에게 급여 지급
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'mayor_only' }, { status: 403 })

  const { targetId } = await req.json()
  if (!targetId) return NextResponse.json({ error: 'missing_target' }, { status: 400 })

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('users').select('id, role, class_id').eq('id', targetId).single()

  if (!target || target.role !== 'officer' || target.class_id !== me.class_id) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const result = await transfer({
    admin, fromType: 'gov', fromId: null,
    toType: 'user', toId: targetId,
    amount: WAGE.officer, type: 'payroll',
    memo: `${today} 공무원 급여`,
    idempotencyKey: `officer-payroll:${targetId}:${today}`,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, wage: WAGE.officer })
}
