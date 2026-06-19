import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExploreForm from './ExploreForm'
import ActivityLocked from '@/components/ActivityLocked'
import type { Stage } from '@/lib/types'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users')
    .select('role, class_id, classes(name, code, color, stage, open_activities)')
    .eq('id', user.id)
    .single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as {
    name: string; code: string; color: string; stage: Stage; open_activities: string[]
  }

  // 교사가 수업 보드에서 이 활동을 열지 않았으면 잠금 (교사는 항상 접근)
  if (me.role !== 'mayor' && !(cls.open_activities ?? []).includes('explore')) {
    return <ActivityLocked title="도시 탐구" emoji="🗺️" />
  }

  const { data: existing } = await supabase
    .from('city_research').select('*').eq('user_id', user.id).maybeSingle()

  return (
    <ExploreForm
      classCode={cls.code}
      cityName={cls.name}
      color={cls.color}
      stage={cls.stage}
      existing={existing}
    />
  )
}
