import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 교사가 지원자를 공무원으로 임명/해제한다. Realtime 즉시 전파.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { studentId, action } = await req.json() // 'appoint' | 'dismiss'
  const admin = createAdminClient()

  const { data: target } = await admin.from('users').select('role, class_id').eq('id', studentId).single()
  if (!target || target.class_id !== mayor.class_id) {
    return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  }

  if (action === 'appoint') {
    if (target.role !== 'applicant') return NextResponse.json({ error: 'not_applicant' }, { status: 400 })
    await admin.from('users').update({ role: 'officer', company_id: null }).eq('id', studentId)
  } else {
    await admin.from('users').update({ role: 'applicant' }).eq('id', studentId)
  }
  return NextResponse.json({ ok: true })
}
