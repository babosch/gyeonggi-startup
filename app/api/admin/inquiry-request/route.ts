import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { inquiryForStage } from '@/lib/inquiry'

function todayStartUTC() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return new Date(kst + 'T00:00:00+09:00').toISOString()
}

// 교사가 탐구 질문 미작성 학생에게 '작성 요청'을 건다.
// = 반려 플레이스홀더를 넣어 내 카드 잠금 + 업무일지 게이트 재개. 학생이 답하면 풀린다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(stage)').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const stage = ((Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: number } | null)?.stage ?? 0
  if (stage < 2) return NextResponse.json({ error: 'no_inquiry_stage' }, { status: 400 })

  const { studentId } = await req.json()
  const admin = createAdminClient()
  const { data: student } = await admin.from('users').select('role, class_id').eq('id', studentId).single()
  if (!student || student.class_id !== me.class_id || !['staff', 'ceo', 'officer'].includes(student.role)) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }

  const { data: latest } = await admin.from('reflections')
    .select('rejected, created_at').eq('user_id', studentId).eq('stage', stage)
    .not('concept_key', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (latest?.rejected) return NextResponse.json({ ok: true }) // 이미 요청/반려됨(잠김)
  if (latest && !latest.rejected && new Date(latest.created_at).getTime() >= new Date(todayStartUTC()).getTime()) {
    return NextResponse.json({ error: 'already_answered' }, { status: 400 })
  }

  const { count } = await admin.from('reflections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', studentId).eq('stage', stage).not('concept_key', 'is', null).eq('rejected', false)
  const q = inquiryForStage(stage, count ?? 0)
  if (!q) return NextResponse.json({ error: 'no_question' }, { status: 400 })

  const { error } = await admin.from('reflections').insert({
    user_id: studentId, stage, prompt: q.question, concept_key: q.conceptKey,
    answer: '(아직 안 씀 — 작성 요청됨)', rejected: true, feedback: '탐구 질문에 답해주세요',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
