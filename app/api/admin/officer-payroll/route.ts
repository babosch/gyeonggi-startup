import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transfer } from '@/lib/ledger'
import { WAGE, PAYROLL_TOTAL_MAX, PAYROLL_DAILY_MAX, PAYROLL_COOLDOWN_MIN } from '@/lib/constants'

function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function todayStartUTC() {
  return new Date(todayKST() + 'T00:00:00+09:00').toISOString()
}

// 교사(시장)가 공무원에게 급여 지급
// 한도: 전체 6회 / 하루 2회 / 30분 쿨다운 / 오늘 업무일지 필수
// idempotency_key는 직원 급여와 동일한 payroll: 접두사 → 전체 횟수 통합 카운트
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

  const today = todayKST()
  const todayStart = todayStartUTC()

  // 1. 오늘 업무일지 확인
  const { count: worklogCount } = await admin
    .from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetId)
    .eq('action', 'worklog')
    .gte('created_at', todayStart)

  if ((worklogCount ?? 0) === 0) {
    return NextResponse.json({ error: 'no_worklog_today' }, { status: 400 })
  }

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

  // 5. 지급
  const slot = (todayCount ?? 0) + 1
  const result = await transfer({
    admin, fromType: 'gov', fromId: null,
    toType: 'user', toId: targetId,
    amount: WAGE.officer, type: 'payroll',
    memo: `${today} 공무원 급여 (${slot}차)`,
    idempotencyKey: `payroll:${targetId}:${today}:${slot}`,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, wage: WAGE.officer, total: (totalCount ?? 0) + 1, todaySlot: slot })
}
