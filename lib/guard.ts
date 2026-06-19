import { createClient } from '@/lib/supabase/server'

// 서버 컴포넌트(활동 페이지)에서 호출: 교사가 수업 보드에 이 활동을 안 열었으면 true(잠금).
// 교사(mayor)는 항상 접근 가능.
export async function activityLocked(activityKey: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false // 미들웨어가 인증 처리

  const { data } = await supabase
    .from('users').select('role, classes(open_activities)').eq('id', user.id).single()
  if (!data || data.role === 'mayor') return false

  const cls = (Array.isArray(data.classes) ? data.classes[0] : data.classes) as { open_activities: string[] } | null
  return !((cls?.open_activities ?? []).includes(activityKey))
}
