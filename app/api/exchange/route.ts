import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 교류 기록 (돈 거래 없음 — 제공/요청만). CEO·공무원이 기록.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (!me || (me.role !== 'ceo' && me.role !== 'officer')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { toCompany, give, want, thanks } = await req.json()
  const admin = createAdminClient()

  // 우리 회사 (CEO면 본인 회사, 공무원이면 give 측 회사 지정 필요 — 여기선 CEO 위주)
  const fromCompany = me.company_id

  const { error } = await admin.from('exchanges').insert({
    class_id: me.class_id,
    from_company: fromCompany,
    to_company: toCompany || null,
    give: give || null,
    want: want || null,
    thanks: thanks || null,
    status: 'recorded',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
