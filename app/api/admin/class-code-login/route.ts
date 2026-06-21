import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 기존 5개 반은 이미 만들어진 계정 이메일 유지 (하위 호환)
const LEGACY_EMAILS: Record<string, string> = {
  '3643441': 'mayor-suwon@classroom.local',
  '3643442': 'mayor-icheon@classroom.local',
  '3643443': 'mayor-goyang@classroom.local',
  '3643444': 'mayor-bucheon@classroom.local',
  '3643445': 'mayor-paju@classroom.local',
}

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ message: '잘못된 학급비번입니다.' }, { status: 400 })

  const admin = createAdminClient()

  // DB에서 반 조회 (코드 기반)
  const { data: cls } = await admin
    .from('classes').select('id, name, code').eq('code', String(code)).maybeSingle()
  if (!cls) return NextResponse.json({ message: '잘못된 학급비번입니다.' }, { status: 400 })

  const email = LEGACY_EMAILS[code] ?? `mayor-${code}@classroom.local`
  const password = `gg_${code}`

  // 기존 계정 찾거나 새로 생성
  let userId: string
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find(u => u.email === email)

  if (existing) {
    userId = existing.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (error || !data.user) {
      return NextResponse.json({ message: '계정 생성에 실패했습니다.' }, { status: 500 })
    }
    userId = data.user.id
  }

  // users 테이블에 시장으로 등록 (멱등)
  const { error: upsErr } = await admin.from('users').upsert(
    { id: userId, class_id: cls.id, number: 0, role: 'mayor', must_change_pin: false },
    { onConflict: 'id' }
  )
  if (upsErr) return NextResponse.json({ message: '시장 등록에 실패했습니다.' }, { status: 500 })

  // 이메일을 클라이언트에 반환 (로그인에 사용)
  return NextResponse.json({ ok: true, email })
}
