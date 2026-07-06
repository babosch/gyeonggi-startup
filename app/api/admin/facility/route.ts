import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 시장이 자기 반 공용 시설을 등록/삭제한다 (공무원과 동일한 시설 목록).
async function getMayor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor' || !me.class_id) return null
  return { id: user.id, classId: me.class_id }
}

export async function POST(req: NextRequest) {
  const mayor = await getMayor()
  if (!mayor) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { name, unit, price } = await req.json()
  if (!name || !name.trim()) return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  if (!Number.isInteger(price) || price < 0) return NextResponse.json({ error: 'invalid_price' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('facilities').insert({
    class_id: mayor.classId,
    name: name.toString().slice(0, 15).trim(),
    unit: (unit ?? '회').toString().slice(0, 4) || '회',
    price,
    created_by: mayor.id,
  }).select('id, name, unit, price').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, facility: data })
}

export async function DELETE(req: NextRequest) {
  const mayor = await getMayor()
  if (!mayor) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const admin = createAdminClient()
  // 같은 반 시설만 삭제
  const { error } = await admin.from('facilities').delete().eq('id', id).eq('class_id', mayor.classId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
