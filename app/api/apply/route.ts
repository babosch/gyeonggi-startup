import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 학생이 회사에 지원
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'applicant') {
    return NextResponse.json({ error: 'only_applicant' }, { status: 403 })
  }

  const { companyId, motivation } = await req.json()
  if (!companyId || typeof motivation !== 'string') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 해당 회사가 같은 반인지 확인
  const { data: company } = await admin
    .from('companies').select('class_id').eq('id', companyId).single()
  if (!company || company.class_id !== me.class_id) {
    return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  }

  // 이미 다른 회사에서 채용됐는지 확인
  const { data: hired } = await admin
    .from('job_applications')
    .select('id').eq('applicant_id', user.id).eq('status', 'hired').maybeSingle()
  if (hired) {
    return NextResponse.json({ error: 'already_hired' }, { status: 400 })
  }

  // upsert: 같은 회사에 이미 지원했으면 motivation 업데이트
  const { error } = await admin.from('job_applications').upsert(
    { company_id: companyId, applicant_id: user.id, motivation: motivation.trim(), status: 'pending' },
    { onConflict: 'company_id,applicant_id', ignoreDuplicates: false }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// CEO가 지원자를 채용 또는 거절
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', user.id).single()
  if (me?.role !== 'ceo' || !me.company_id) {
    return NextResponse.json({ error: 'only_ceo' }, { status: 403 })
  }

  const { applicationId, action } = await req.json() // action: 'hire' | 'reject'
  if (!applicationId || !['hire', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: app } = await admin.from('job_applications')
    .select('id, applicant_id, company_id, status')
    .eq('id', applicationId).single()
  if (!app || app.company_id !== me.company_id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (action === 'reject') {
    await admin.from('job_applications').update({ status: 'rejected' }).eq('id', applicationId)
    return NextResponse.json({ ok: true })
  }

  // hire: 직원 수 확인
  const { count } = await admin.from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', me.company_id).eq('role', 'staff')
  if ((count ?? 0) >= 4) {
    return NextResponse.json({ error: 'full' }, { status: 400 })
  }

  // 이미 다른 곳에 채용됐는지 확인
  const { data: already } = await admin.from('users')
    .select('role').eq('id', app.applicant_id).single()
  if (already?.role !== 'applicant') {
    return NextResponse.json({ error: 'already_hired' }, { status: 400 })
  }

  // 채용: 지원서 상태 변경 + 사용자 역할 전직
  await admin.from('job_applications').update({ status: 'hired' }).eq('id', applicationId)
  // 같은 지원자의 다른 회사 지원서를 rejected로 처리
  await admin.from('job_applications')
    .update({ status: 'rejected' })
    .eq('applicant_id', app.applicant_id)
    .neq('id', applicationId)

  await admin.from('users').update({
    role: 'staff',
    company_id: me.company_id,
    reveal_pending: 'staff',
  }).eq('id', app.applicant_id)

  return NextResponse.json({ ok: true })
}
