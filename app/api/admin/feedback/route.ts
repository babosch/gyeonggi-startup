import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const TABLE: Record<string, string> = {
  plan: 'business_plans', research: 'city_research', reflection: 'reflections',
}

// 교사가 학생 제출물에 피드백을 저장한다.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { type, id, feedback } = await req.json()
  const table = TABLE[type]
  if (!table || !id) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from(table).update({ feedback }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
