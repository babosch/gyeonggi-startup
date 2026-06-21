import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer } from '@/lib/ledger'
import { WAGE } from '@/lib/constants'

// CEO가 직원(또는 본인)에게 오늘 급여를 지급한다.
// 수업일당 1회 멱등: idempotencyKey = payroll-{targetId}-{YYYY-MM-DD}
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { targetId } = await req.json()
  const admin = createAdminClient()

  // 대상 검증 (같은 회사 직원 또는 CEO 본인)
  const { data: target } = await admin.from('users').select('id, role, company_id').eq('id', targetId).single()
  if (!target || target.company_id !== ceo.company_id) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }
  const wage = target.role === 'ceo' ? WAGE.ceo : WAGE.staff
  const today = new Date().toISOString().slice(0, 10)

  // 급여는 정부(gov) 발행 — 회사 잔액과 무관하게 지급
  const result = await transfer({
    admin, fromType: 'gov', fromId: null, toType: 'user', toId: targetId,
    amount: wage, type: 'payroll', memo: `${today} 급여`,
    idempotencyKey: `payroll:${targetId}:${today}`,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true, wage })
}
