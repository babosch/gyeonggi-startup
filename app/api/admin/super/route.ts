import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/superadmin'

// 슈퍼어드민 전용 정리 작업.
// action: 'remove_mayor'(반 시장 해제) | 'delete_account'(떠도는 교사 계정 삭제)
async function canAccess() {
  const { ok } = await isSuperAdmin()
  if (ok) return true
  // 시흥시(3643410) 교사도 슈퍼어드민 접근 허용
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor' || !me.class_id) return false
  const { data: cls } = await supabase.from('classes').select('code').eq('id', me.class_id).single()
  return cls?.code === '3643410'
}

export async function POST(req: NextRequest) {
  const ok = await canAccess()
  if (!ok) return NextResponse.json({ error: 'forbidden', message: '슈퍼어드민만 사용할 수 있어요.' }, { status: 403 })

  const { action, classId, userId } = await req.json()
  const admin = createAdminClient()

  if (action === 'remove_mayor') {
    // 그 반의 시장(number=0, role=mayor) 행 삭제 → 시장 자리 비움
    const { error } = await admin.from('users')
      .delete().eq('class_id', classId).eq('role', 'mayor').eq('number', 0)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'fix_class_codes') {
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

  if (action === 'reset_class_students') {
    if (!classId) return NextResponse.json({ error: 'classId required' }, { status: 400 })

    // 1. 해당 반 학생 ID 수집 (mayor 제외)
    const { data: studentRows } = await admin.from('users')
      .select('id').eq('class_id', classId).in('role', ['applicant', 'ceo', 'staff', 'officer'])
    const studentIds = (studentRows ?? []).map(r => r.id)

    if (studentIds.length > 0) {
      // 2. CASCADE 없는 FK 먼저 NULL 처리
      await admin.from('officer_alerts').update({ officer_id: null }).in('officer_id', studentIds)
      await admin.from('facilities').update({ created_by: null }).in('created_by', studentIds)

      // 3. user_id 기준 삭제 (officer_alerts는 class_id로 별도 처리)
      const userTables = [
        'transactions', 'accounts', 'inspection_reports',
        'trade_reports', 'requisitions', 'job_applications', 'business_plans',
        'city_research', 'activity_logs', 'reflections', 'concept_responses',
        'wordcloud_words', 'teacher_notes',
      ]
      for (const table of userTables) {
        await admin.from(table).delete().in('user_id', studentIds)
      }
    }

    // 4. 반 단위 데이터 삭제
    const { data: companies } = await admin.from('companies').select('id').eq('class_id', classId)
    const companyIds = (companies ?? []).map(c => c.id)
    if (companyIds.length > 0) {
      await admin.from('products').delete().in('company_id', companyIds)
      await admin.from('exchange_cards').delete().in('company_id', companyIds)
      await admin.from('facility_uses').delete().in('company_id', companyIds)
    }
    await admin.from('officer_alerts').delete().eq('class_id', classId)
    await admin.from('companies').delete().eq('class_id', classId)
    await admin.from('exchanges').delete().eq('class_id', classId)
    await admin.from('exchange_logs').delete().eq('class_id', classId)
    await admin.from('exchange_matches').delete().eq('class_id', classId)

    // 5. users 행 삭제
    if (studentIds.length > 0) {
      await admin.from('users').delete().in('id', studentIds)
    }

    // 6. auth 계정 삭제
    const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const toDelete = (authList?.users ?? []).filter(u => studentIds.includes(u.id))
    for (const u of toDelete) {
      await admin.auth.admin.deleteUser(u.id)
    }

    // 7. 반 단계 0으로 초기화
    await admin.from('classes').update({ stage: 0 }).eq('id', classId)

    return NextResponse.json({ ok: true, deleted: toDelete.length })
  }

  if (action === 'reset_all_students') {
    // 1. 학생 users 행 수집 (mayor 제외)
    const { data: studentRows } = await admin.from('users')
      .select('id').in('role', ['applicant', 'ceo', 'staff', 'officer'])
    const studentIds = (studentRows ?? []).map(r => r.id)

    if (studentIds.length > 0) {
      // 2. CASCADE 없는 FK 먼저 NULL로 처리 (삭제 차단 방지)
      await admin.from('officer_alerts').update({ officer_id: null }).in('officer_id', studentIds)
      await admin.from('facilities').update({ created_by: null }).in('created_by', studentIds)

      // 3. user_id 기준 삭제
      const userTables = [
        'transactions', 'accounts', 'inspection_reports',
        'trade_reports', 'requisitions', 'job_applications', 'business_plans',
        'city_research', 'activity_logs', 'reflections', 'concept_responses',
        'wordcloud_words', 'teacher_notes',
      ]
      for (const t of userTables) {
        await admin.from(t).delete().in('user_id', studentIds)
      }
    }

    // 4. 회사·상품·교류 전체 삭제
    const { data: allCompanies } = await admin.from('companies').select('id')
    const allCompanyIds = (allCompanies ?? []).map(c => c.id)
    if (allCompanyIds.length > 0) {
      await admin.from('products').delete().in('company_id', allCompanyIds)
      await admin.from('exchange_cards').delete().in('company_id', allCompanyIds)
      await admin.from('facility_uses').delete().in('company_id', allCompanyIds)
    }
    await admin.from('officer_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await admin.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await admin.from('exchanges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await admin.from('exchange_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await admin.from('exchange_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await admin.from('word_merges').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 5. users 행 삭제
    if (studentIds.length > 0) {
      await admin.from('users').delete().in('id', studentIds)
    }

    // 6. auth 계정 삭제
    const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const toDelete = (authList?.users ?? []).filter(u =>
      u.email?.includes('classroom.local') && !u.email?.startsWith('mayor-')
    )
    for (const u of toDelete) {
      await admin.auth.admin.deleteUser(u.id)
    }

    // 7. 모든 반 0단계로 초기화
    await admin.from('classes').update({ stage: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ ok: true, deleted: toDelete.length })
  }

  if (action === 'delete_account') {
    // 교사 auth 계정 + users 행 삭제 (학생 계정은 보호 — classroom.local 제외)
    const { data: au } = await admin.auth.admin.getUserById(userId)
    if (au?.user?.email?.includes('classroom.local')) {
      return NextResponse.json({ error: 'student_protected', message: '학생 계정은 여기서 지울 수 없어요.' }, { status: 400 })
    }
    await admin.from('users').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'bad_action' }, { status: 400 })
}
