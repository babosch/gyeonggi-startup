import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'mayor_only' }, { status: 403 })

  const admin = createAdminClient()
  const fixes = [
    { name: '수원시', code: '3643441', color: 'amber' },
    { name: '이천시', code: '3643442', color: 'blue' },
    { name: '고양시', code: '3643443', color: 'pink' },
    { name: '부천시', code: '3643444', color: 'purple' },
    { name: '파주시', code: '3643445', color: 'green' },
  ]
  for (const f of fixes) {
    await admin.from('classes').update({ code: f.code, color: f.color }).eq('name', f.name)
  }
  await admin.from('classes').upsert(
    { name: '시흥시', code: '3643410', color: 'teal', stage: 0 },
    { onConflict: 'code' }
  )
  return NextResponse.json({ ok: true })
}
