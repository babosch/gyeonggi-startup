import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import WorklogForm from './WorklogForm'
import type { Stage } from '@/lib/types'

function todayStartUTC() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return new Date(kst + 'T00:00:00+09:00').toISOString()
}

export default async function WorklogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('worklog')) return <ActivityLocked activityKey="worklog" />

  const { data: me } = await supabase
    .from('users').select('role, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  // 오늘 업무일지 (상태 포함)
  const { data: today } = await supabase
    .from('activity_logs').select('id, payload, status, feedback, created_at')
    .eq('user_id', user.id).eq('action', 'worklog')
    .gte('created_at', todayStartUTC())
    .order('created_at', { ascending: true })

  // 최초 작성 여부 (개념 팝업용)
  const { count: everCount } = await supabase
    .from('activity_logs').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('action', 'worklog')

  const todayLogs = (today ?? []).map(t => ({
    id: t.id as string,
    text: (t.payload as { text?: string })?.text ?? '',
    status: (t.status as string) ?? 'submitted',
    feedback: (t.feedback as string | null) ?? null,
    created_at: t.created_at as string,
  }))

  return <WorklogForm stage={cls.stage} role={me.role} today={todayLogs} firstEver={(everCount ?? 0) === 0} />
}
