import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 학급비번 → 반 매핑 (하드코딩)
const CLASS_MAP: Record<string, { classId: string; email: string }> = {
  '3643441': { classId: 'b3819314-3e2a-47bf-81ca-d40253e357bc', email: 'mayor-suwon@classroom.local' },
  '3643442': { classId: 'f0519801-62eb-4cf5-97b6-9cb867a45c07', email: 'mayor-icheon@classroom.local' },
  '3643443': { classId: '610ebd05-0888-401c-8dfa-909383881fbc', email: 'mayor-goyang@classroom.local' },
  '3643444': { classId: '24b3d171-e461-42c9-b129-e2b82bbc1b3c', email: 'mayor-bucheon@classroom.local' },
  '3643445': { classId: 'f8613645-7f9a-4b5f-a320-2df460e1e7da', email: 'mayor-paju@classroom.local' },
}

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  const entry = CLASS_MAP[String(code)]
  if (!entry) return NextResponse.json({ message: '잘못된 학급비번입니다.' }, { status: 400 })

  const admin = createAdminClient()
  const password = `gg_${code}`

  // 기존 계정 찾거나 새로 생성
  let userId: string
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = users.find(u => u.email === entry.email)

  if (existing) {
    userId = existing.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: entry.email,
      password,
      email_confirm: true,
    })
    if (error || !data.user) {
      return NextResponse.json({ message: '계정 생성에 실패했습니다.' }, { status: 500 })
    }
    userId = data.user.id
  }

  // users 테이블에 시장으로 등록 (멱등)
  const { error: upsErr } = await admin.from('users').upsert(
    { id: userId, class_id: entry.classId, number: 0, role: 'mayor', must_change_pin: false },
    { onConflict: 'id' }
  )
  if (upsErr) return NextResponse.json({ message: '시장 등록에 실패했습니다.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
