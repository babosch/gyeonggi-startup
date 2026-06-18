import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { classId } = await req.json()
  const admin = createAdminClient()

  // users 테이블에 교사 행 upsert (number=0 으로 구분)
  const { error } = await admin.from('users').upsert({
    id: user.id,
    class_id: classId,
    number: 0,
    role: 'mayor',
    must_change_pin: false,
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
