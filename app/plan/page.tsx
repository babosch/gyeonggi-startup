import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlanForm from './PlanForm'
import ActivityLocked from '@/components/ActivityLocked'
import type { Stage } from '@/lib/types'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, classes(name, stage, open_activities)').eq('id', user.id).single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string; stage: Stage; open_activities: string[] }

  if (me.role !== 'mayor' && !(cls.open_activities ?? []).includes('plan')) {
    return <ActivityLocked title="사업계획서" emoji="📝" />
  }

  const { data: existing } = await supabase
    .from('business_plans').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  return (
    <PlanForm
      role={me.role}
      cityName={cls.name}
      stage={cls.stage}
      existing={existing}
    />
  )
}
