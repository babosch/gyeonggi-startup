import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 공무원이 두 회사를 교류 매칭
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || (me.role !== 'officer' && me.role !== 'mayor')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { companyAId, companyBId } = await req.json()
  if (!companyAId || !companyBId || companyAId === companyBId) {
    return NextResponse.json({ error: 'invalid_companies' }, { status: 400 })
  }

  // 정규화: 항상 작은 UUID가 company_a (중복 방지)
  const [a, b] = [companyAId, companyBId].sort()

  const admin = createAdminClient()
  const { error } = await admin.from('exchange_matches').insert({
    class_id: me.class_id,
    company_a: a,
    company_b: b,
    officer_id: user.id,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already_matched' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
