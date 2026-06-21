import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/superadmin'

// 슈퍼어드민 전용 정리 작업.
// action: 'remove_mayor'(반 시장 해제) | 'delete_account'(떠도는 교사 계정 삭제)
export async function POST(req: NextRequest) {
  const { ok } = await isSuperAdmin()
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

  if (action === 'reset_all_students') {
    // 학생 데이터 전체 초기화 — 교사(mayor) 계정은 보존
    const tables = [
      'transactions', 'accounts',
      'exchange_logs', 'exchange_matches', 'exchange_cards', 'exchanges',
      'inspection_reports', 'officer_alerts', 'trade_reports',
      'requisitions', 'job_applications', 'business_plans', 'city_research',
      'activity_logs', 'reflections', 'concept_responses',
      'wordcloud_words', 'word_merges', 'teacher_notes', 'facility_uses',
      'products', 'companies',
    ]
    for (const table of tables) {
      await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }

    // 학생 auth 계정 삭제 (mayor- 이메일 제외)
    const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const students = (authList?.users ?? []).filter(u => u.email?.includes('classroom.local') && !u.email?.startsWith('mayor-'))
    for (const u of students) {
      await admin.auth.admin.deleteUser(u.id)
    }

    // 모든 반 0단계로 초기화
    await admin.from('classes').update({ stage: 0 }).neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ ok: true, deleted: students.length })
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
