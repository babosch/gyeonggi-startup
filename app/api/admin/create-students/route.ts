import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 교사 인증 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { classId, count } = await req.json() // count: 학생 수 (기본 25)
  const admin = createAdminClient()

  // 반 정보
  const { data: cls } = await admin.from('classes').select('code').eq('id', classId).single()
  if (!cls) return NextResponse.json({ error: 'class_not_found' }, { status: 404 })

  const results = []
  const errors = []

  for (let number = 1; number <= count; number++) {
    const email = `${cls.code.toLowerCase()}-${number}@classroom.local`
    const defaultPin = '1234'

    // Supabase Auth 계정 생성
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: defaultPin,
      email_confirm: true,
    })

    if (authErr) {
      // 이미 존재하면 스킵
      if (authErr.message.includes('already')) {
        errors.push({ number, reason: 'already_exists' })
        continue
      }
      errors.push({ number, reason: authErr.message })
      continue
    }

    // users 테이블에 행 삽입
    const { error: userErr } = await admin.from('users').upsert({
      id: authUser.user.id,
      class_id: classId,
      number,
      role: 'applicant',
      must_change_pin: true,
    }, { onConflict: 'class_id,number' })

    if (userErr) errors.push({ number, reason: userErr.message })
    else results.push(number)
  }

  return NextResponse.json({ created: results.length, skipped: errors.length, errors })
}
