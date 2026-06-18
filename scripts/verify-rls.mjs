// RLS 검증 스크립트 — 학생/교사 로그인 후 자기 행을 읽을 수 있는지 확인
// 실행: node scripts/verify-rls.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const anon = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim()

const client = createClient(url, anon, { auth: { persistSession: false } })

// 첫 번째 반의 1번 학생으로 로그인 시도
const { data: cls } = await client.from('classes').select('code, name').order('name').limit(1).single()
const email = `${cls.code.toLowerCase()}-1@classroom.local`

const { data: auth, error: authErr } = await client.auth.signInWithPassword({ email, password: '1234' })
if (authErr) {
  console.log('⚠️  1번 학생 PIN이 1234가 아님(이미 변경됨) 또는 계정 없음:', authErr.message)
  process.exit(0)
}

const { data: me, error: meErr } = await client
  .from('users').select('*, classes(*)').eq('id', auth.user.id).single()

if (meErr) {
  console.log('❌ RLS 실패:', meErr.message)
  process.exit(1)
}
console.log('✅ RLS 정상 — 학생이 자기 행을 읽음:', {
  number: me.number, role: me.role, class: me.classes?.name,
})
