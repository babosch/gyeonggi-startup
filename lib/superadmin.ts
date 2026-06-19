import { createClient } from '@/lib/supabase/server'

// 현재 로그인한 사용자가 슈퍼어드민인지 확인한다.
// SUPER_ADMIN_EMAIL 환경변수의 이메일과 일치해야 한다.
export async function isSuperAdmin(): Promise<{ ok: boolean; userId?: string }> {
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  if (!superEmail) return { ok: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false }

  return { ok: user.email.trim().toLowerCase() === superEmail, userId: user.id }
}
