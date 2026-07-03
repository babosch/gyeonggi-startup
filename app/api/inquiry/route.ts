import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { INQUIRY_BY_ID, includesKeyword } from '@/lib/inquiry'

// 학생이 업무일지 전 탐구 질문에 답한다 → reflections에 개념 태그와 함께 저장.
// 필수 낱말이 답에 포함돼야 저장된다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!me || !['staff', 'ceo', 'officer'].includes(me.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { inquiryId, answer } = await req.json()
  const inquiry = INQUIRY_BY_ID[inquiryId]
  if (!inquiry) return NextResponse.json({ error: 'invalid_inquiry' }, { status: 400 })
  if (!answer || !answer.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })
  if (!includesKeyword(answer, inquiry.required)) {
    return NextResponse.json({ error: 'keyword_missing', required: inquiry.required }, { status: 400 })
  }

  const { error } = await supabase.from('reflections').insert({
    user_id: user.id,
    stage: inquiry.stage,
    prompt: inquiry.question,
    answer: answer.toString().slice(0, 300).trim(),
    concept_key: inquiry.conceptKey,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
