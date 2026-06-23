import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 교사 공통사항 공유 게시판. 모든 반 교사가 공유.
// 쓰기·삭제는 admin 클라이언트로 처리(작성자는 본인 글만 삭제 가능).
async function getMayor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase
    .from('users').select('id, role, class_id, classes(name)').eq('id', user.id).single()
  if (me?.role !== 'mayor') return null
  const cls = Array.isArray(me.classes) ? me.classes[0] : me.classes
  return { id: me.id, city: (cls as { name: string } | null)?.name ?? '' }
}

export async function POST(req: NextRequest) {
  const mayor = await getMayor()
  if (!mayor) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { title, body, visibleToStudents } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('shared_notices').insert({
    author_id: mayor.id,
    author_city: mayor.city,
    title: title.toString().slice(0, 100),
    body: body.toString().slice(0, 2000),
    visible_to_students: !!visibleToStudents,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const mayor = await getMayor()
  if (!mayor) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const admin = createAdminClient()
  // 작성자 본인 글만 삭제
  const { error } = await admin.from('shared_notices').delete().eq('id', id).eq('author_id', mayor.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
