import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer } from '@/lib/ledger'
import { WAGE, PAYROLL_TOTAL_MAX, PAYROLL_DAILY_MAX, PAYROLL_COOLDOWN_MIN } from '@/lib/constants'

function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function todayStartUTC() {
  return new Date(todayKST() + 'T00:00:00+09:00').toISOString()
}

// CEO가 직원(또는 본인)에게 급여를 지급한다.
// 한도: 전체 6회 / 하루 2회 / 30분 쿨다운 / 오늘 업무일지 필수
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { worklogId } = await req.json()
  if (!worklogId) return NextResponse.json({ error: 'missing_worklog' }, { status: 400 })
  const admin = createAdminClient()

  // 0. 업무일지 검증 — 이 일지를 '승인하고 지급'한다 (제출 상태만, 지급/반려된 건 불가)
  const { data: wl } = await admin.from('activity_logs')
    .select('id, user_id, action, status').eq('id', worklogId).single()
  if (!wl || wl.action !== 'worklog') return NextResponse.json({ error: 'invalid_worklog' }, { status: 400 })
  if (wl.status === 'paid') return NextResponse.json({ error: 'already_paid' }, { status: 400 })
  if (wl.status === 'rejected') return NextResponse.json({ error: 'worklog_rejected' }, { status: 400 })
  const targetId = wl.user_id

  // 대상 검증 (같은 회사 직원 또는 CEO 본인)
  const { data: target } = await admin
    .from('users').select('id, role, company_id').eq('id', targetId).single()
  if (!target || target.company_id !== ceo.company_id) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }

  const today = todayKST()

  // 2. 전체 지급 횟수 확인
  const { count: totalCount } = await admin
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .like('idempotency_key', `payroll:${targetId}:%`)

  if ((totalCount ?? 0) >= PAYROLL_TOTAL_MAX) {
    return NextResponse.json({ error: 'total_limit_reached', paid: totalCount, max: PAYROLL_TOTAL_MAX }, { status: 400 })
  }

  // 3. 오늘 지급 횟수 확인
  const { count: todayCount } = await admin
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .like('idempotency_key', `payroll:${targetId}:${today}:%`)

  if ((todayCount ?? 0) >= PAYROLL_DAILY_MAX) {
    return NextResponse.json({ error: 'daily_limit_reached', paid: todayCount, max: PAYROLL_DAILY_MAX }, { status: 400 })
  }

  // 4. 30분 쿨다운 확인
  const { data: lastTx } = await admin
    .from('transactions')
    .select('created_at')
    .like('idempotency_key', `payroll:${targetId}:%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastTx) {
    const minutesSince = (Date.now() - new Date(lastTx.created_at).getTime()) / 60000
    if (minutesSince < PAYROLL_COOLDOWN_MIN) {
      return NextResponse.json({
        error: 'cooldown',
        remainingMinutes: Math.ceil(PAYROLL_COOLDOWN_MIN - minutesSince),
      }, { status: 400 })
    }
  }

  // 5. 지급 (업무일지 1건당 1회 — 멱등키에 worklogId 사용)
  const slot = (todayCount ?? 0) + 1
  const wage = target.role === 'ceo' ? WAGE.ceo : WAGE.staff
  const result = await transfer({
    admin, fromType: 'gov', fromId: null, toType: 'user', toId: targetId,
    amount: wage, type: 'payroll', memo: `${today} 급여 (${slot}차)`,
    idempotencyKey: `payroll:${targetId}:${today}:${worklogId}`,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  // 6. 업무일지 지급완료 처리 (잠금 — 반려 불가)
  await admin.from('activity_logs').update({ status: 'paid' }).eq('id', worklogId)

  return NextResponse.json({ ok: true, wage, total: (totalCount ?? 0) + 1, todaySlot: slot })
}
