import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { containsBadWord } from '@/lib/badwords'

// 학생이 단어 제출
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || me.role === 'mayor') {
    return NextResponse.json({ error: 'students_only' }, { status: 403 })
  }

  const { word } = await req.json()
  const clean = String(word ?? '').trim()
  if (!clean || clean.length < 1 || clean.length > 12) {
    return NextResponse.json({ error: '1~12자 사이로 입력해요' }, { status: 400 })
  }

  if (containsBadWord(clean)) {
    return NextResponse.json({ error: 'bad_word' }, { status: 422 })
  }

  const { error } = await supabase.from('wordcloud_words').insert({
    class_id: me.class_id, user_id: user.id, word: clean,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 교사가 단어 숨김/복원
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'only_mayor' }, { status: 403 })

  const { wordId, hidden } = await req.json()
  const admin = createAdminClient()
  await admin.from('wordcloud_words').update({ hidden }).eq('id', wordId)
  return NextResponse.json({ ok: true })
}
