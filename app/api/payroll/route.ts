import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer } from '@/lib/ledger'
import { WAGE, STAGE_PAYROLL_MAX } from '@/lib/constants'

// CEO가 직원(또는 본인)에게 오늘 급여를 지급한다.
// 단계별 한도: 생산 4일, 교류 1일, 판매 1일 (idempotencyKey에 stage 포함)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { targetId } = await req.json()
  const admin = createAdminClient()

  // 대상 검증 (같은 회사 직원 또는 CEO 본인)
  const { data: target } = await admin
    .from('users').select('id, role, company_id').eq('id', targetId).single()
  if (!target || target.company_id !== ceo.company_id) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }

  // 현재 수업 단계 조회
  const { data: cls } = await admin
    .from('classes').select('stage').eq('id', ceo.class_id).single()
  const stage: number = cls?.stage ?? 2

  // 단계별 지급 한도 확인
  const stageMax = STAGE_PAYROLL_MAX[stage]
  if (stageMax !== undefined) {
    const { count } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .like('idempotency_key', `payroll:${targetId}:${stage}:%`)

    if ((count ?? 0) >= stageMax) {
      return NextResponse.json({
        error: 'payroll_limit_reached',
        paid: count,
        max: stageMax,
        stage,
      }, { status: 400 })
    }
  }

  const wage = target.role === 'ceo' ? WAGE.ceo : WAGE.staff
  const today = new Date().toISOString().slice(0, 10)

  // 급여는 정부(gov) 발행 — 회사 잔액과 무관, key에 단계 포함
  const result = await transfer({
    admin, fromType: 'gov', fromId: null, toType: 'user', toId: targetId,
    amount: wage, type: 'payroll', memo: `${today} 급여 (${stage}단계)`,
    idempotencyKey: `payroll:${targetId}:${stage}:${today}`,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true, wage })
}
