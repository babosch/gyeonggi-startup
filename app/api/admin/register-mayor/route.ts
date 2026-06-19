import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 교사를 한 반의 시장으로 등록한다. 한 반 = 시장 1명, 한 교사 = 한 반.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized', message: '로그인이 필요해요.' }, { status: 401 })

  const { classId } = await req.json()
  const admin = createAdminClient()

  // 1) 이 교사가 이미 다른 반 시장인가?
  const { data: myRow } = await admin
    .from('users').select('class_id, role').eq('id', user.id).maybeSingle()
  if (myRow?.role === 'mayor' && myRow.class_id !== classId) {
    const { data: c } = await admin.from('classes').select('name').eq('id', myRow.class_id).single()
    return NextResponse.json({
      error: 'already_mayor_elsewhere',
      message: `이미 ${c?.name ?? '다른 반'} 시장으로 등록돼 있어요. 한 분은 한 반만 맡을 수 있어요. 반을 바꾸려면 슈퍼어드민에게 요청하세요.`,
    }, { status: 409 })
  }

  // 2) 이 반에 이미 다른 시장이 있는가?
  const { data: other } = await admin
    .from('users').select('id').eq('class_id', classId).eq('role', 'mayor').neq('id', user.id).maybeSingle()
  if (other) {
    const { data: c } = await admin.from('classes').select('name').eq('id', classId).single()
    return NextResponse.json({
      error: 'class_has_mayor',
      message: `${c?.name ?? '이 반'}은 이미 다른 선생님이 시장이에요. 다른 반을 선택해 주세요.`,
    }, { status: 409 })
  }

  // 3) 등록 (이미 이 반 시장이면 멱등)
  const { error } = await admin.from('users').upsert({
    id: user.id, class_id: classId, number: 0, role: 'mayor', must_change_pin: false,
  }, { onConflict: 'id' })
  if (error) {
    return NextResponse.json({ error: error.message, message: '등록 중 문제가 생겼어요. 다시 시도해 주세요.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
