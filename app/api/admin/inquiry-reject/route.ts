import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 교사가 탐구 질문 응답을 반려한다 → rejected=true + 사유(feedback).
// 학생은 업무일지 화면에서 같은 질문을 사유와 함께 다시 받아 재작성한다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { reflectionId, feedback } = await req.json()
  if (!reflectionId) return NextResponse.json({ error: 'missing' }, { status: 400 })

  const admin = createAdminClient()
  const { data: refl } = await admin.from('reflections').select('id, user_id').eq('id', reflectionId).single()
  if (!refl) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // 같은 반 학생인지 확인
  const { data: author } = await admin.from('users').select('class_id').eq('id', refl.user_id).single()
  if (!author || author.class_id !== me.class_id) return NextResponse.json({ error: 'wrong_class' }, { status: 403 })

  const { error } = await admin.from('reflections')
    .update({ rejected: true, feedback: (feedback ?? '').toString().slice(0, 200) || null })
    .eq('id', reflectionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
