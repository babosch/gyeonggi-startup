import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pinToPassword } from '@/lib/auth'

// 교사가 학생 데이터를 수정한다 (오입력 정정용)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const body = await req.json()
  const { studentId, action } = body

  // 대상 학생이 같은 반인지 확인
  const { data: student } = await admin
    .from('users').select('id, role, company_id, class_id, number').eq('id', studentId).single()
  if (!student || student.class_id !== mayor.class_id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  switch (action) {
    case 'set_role': {
      const { role, companyId } = body
      if (!['applicant', 'ceo', 'staff', 'officer'].includes(role)) {
        return NextResponse.json({ error: 'invalid_role' }, { status: 400 })
      }
      await admin.from('users').update({
        role,
        company_id: companyId ?? null,
        reveal_pending: null,
      }).eq('id', studentId)

      // 채용된 경우 기존 job_applications 정리
      if (role !== 'staff' && role !== 'ceo') {
        await admin.from('job_applications')
          .update({ status: 'rejected' })
          .eq('applicant_id', studentId)
          .eq('status', 'hired')
      }
      return NextResponse.json({ ok: true })
    }

    case 'reset_pin': {
      const { newPin } = body
      if (!newPin || !/^\d{4}$/.test(newPin)) {
        return NextResponse.json({ error: 'invalid_pin' }, { status: 400 })
      }
      const { data: cls } = await admin
        .from('classes').select('code').eq('id', student.class_id).single()
      const email = `${cls!.code.toLowerCase()}-${student.number}@classroom.local`
      // Supabase admin auth: update user password by email
      const { data: authUser } = await admin.auth.admin.listUsers()
      const target = authUser.users.find(u => u.email === email)
      if (!target) return NextResponse.json({ error: 'auth_user_not_found' }, { status: 404 })
      await admin.auth.admin.updateUserById(target.id, { password: pinToPassword(newPin) })
      await admin.from('users').update({ must_change_pin: false }).eq('id', studentId)
      return NextResponse.json({ ok: true })
    }

    case 'set_nickname': {
      const { nickname } = body
      await admin.from('users').update({ nickname: nickname ?? null }).eq('id', studentId)
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  }
}
