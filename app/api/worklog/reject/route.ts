import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 지급자가 업무일지를 반려한다.
//  - 직원·CEO 일지: 그 회사의 CEO가 반려
//  - 공무원 일지: 그 반의 교사(시장)가 반려
// 이미 지급(paid)된 일지는 반려 불가.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (!caller) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { worklogId, feedback } = await req.json()
  if (!worklogId) return NextResponse.json({ error: 'missing' }, { status: 400 })

  const admin = createAdminClient()
  const { data: wl } = await admin.from('activity_logs')
    .select('id, user_id, action, status').eq('id', worklogId).single()
  if (!wl || wl.action !== 'worklog') return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  if (wl.status === 'paid') return NextResponse.json({ error: 'already_paid' }, { status: 400 })

  const { data: author } = await admin
    .from('users').select('role, company_id, class_id').eq('id', wl.user_id).single()
  if (!author) return NextResponse.json({ error: 'invalid_target' }, { status: 400 })

  // 권한: 공무원 일지는 같은 반 교사, 그 외(직원·CEO)는 같은 회사 CEO 또는 같은 반 교사(CEO 부재 대비)
  const allowed = author.role === 'officer'
    ? caller.role === 'mayor' && caller.class_id === author.class_id
    : (caller.role === 'ceo' && !!caller.company_id && caller.company_id === author.company_id)
      || (caller.role === 'mayor' && caller.class_id === author.class_id)
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { error } = await admin.from('activity_logs')
    .update({ status: 'rejected', feedback: (feedback ?? '').toString().slice(0, 500) || null })
    .eq('id', worklogId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
