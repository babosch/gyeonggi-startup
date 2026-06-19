import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import WorklogForm from './WorklogForm'
import type { Stage } from '@/lib/types'

export default async function WorklogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('worklog')) return <ActivityLocked activityKey="worklog" />

  const { data: me } = await supabase
    .from('users').select('role, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  const { data: past } = await supabase
    .from('activity_logs').select('payload, created_at')
    .eq('user_id', user.id).eq('action', 'worklog')
    .order('created_at', { ascending: false }).limit(7)

  return <WorklogForm stage={cls.stage} role={me.role} past={past ?? []} />
}
