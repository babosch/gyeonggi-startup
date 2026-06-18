import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { MAX_STAFF_PER_COMPANY } from '@/lib/constants'

// CEO가 지원자를 직원으로 채용한다. role 변경은 Realtime으로 즉시 전파됨.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) {
    return NextResponse.json({ error: 'not_ceo' }, { status: 403 })
  }

  const { applicantId } = await req.json()
  const admin = createAdminClient()

  // 정원 확인
  const { count } = await admin.from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', ceo.company_id).eq('role', 'staff')
  if ((count ?? 0) >= MAX_STAFF_PER_COMPANY) {
    return NextResponse.json({ error: 'full' }, { status: 400 })
  }

  // 지원자 검증 (같은 반·applicant)
  const { data: applicant } = await admin
    .from('users').select('role, class_id').eq('id', applicantId).single()
  if (!applicant || applicant.role !== 'applicant' || applicant.class_id !== ceo.class_id) {
    return NextResponse.json({ error: 'invalid_applicant' }, { status: 400 })
  }

  const { error } = await admin.from('users')
    .update({ role: 'staff', company_id: ceo.company_id }).eq('id', applicantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
