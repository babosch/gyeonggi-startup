import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function todayStartUTC() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return new Date(kst + 'T00:00:00+09:00').toISOString()
}

const WORKLOG_DAILY_MAX = 2  // 하루 최대 2건 (급여 하루 2회와 1:1)

// 학생(직원·CEO·공무원)이 업무일지를 작성 또는 반려 후 수정·재제출한다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || !['staff', 'ceo', 'officer'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { text, worklogId } = await req.json()
  if (!text || !text.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })
  const payload = { text: text.toString().slice(0, 200).trim() }

  if (worklogId) {
    // 수정(반려 후 재제출) — 본인 업무일지, 지급완료(paid)는 수정 불가
    const { data: ex } = await supabase.from('activity_logs')
      .select('user_id, action, status').eq('id', worklogId).single()
    if (!ex || ex.user_id !== user.id || ex.action !== 'worklog') {
      return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
    }
    if (ex.status === 'paid') return NextResponse.json({ error: 'already_paid' }, { status: 400 })
    const { data: upd, error } = await supabase.from('activity_logs')
      .update({ payload, status: 'submitted' }).eq('id', worklogId).eq('user_id', user.id).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!upd || upd.length === 0) return NextResponse.json({ error: 'update_blocked' }, { status: 403 })
    return NextResponse.json({ ok: true, id: worklogId })
  }

  // 신규 — 하루 2건 제한
  const { count } = await supabase.from('activity_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('action', 'worklog').gte('created_at', todayStartUTC())
  if ((count ?? 0) >= WORKLOG_DAILY_MAX) {
    return NextResponse.json({ error: 'daily_limit', max: WORKLOG_DAILY_MAX }, { status: 400 })
  }

  const { data: ins, error } = await supabase.from('activity_logs')
    .insert({ user_id: user.id, class_id: me.class_id, action: 'worklog', payload, status: 'submitted' })
    .select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: ins?.id })
}
