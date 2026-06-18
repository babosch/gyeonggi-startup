import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExploreForm from './ExploreForm'
import type { Stage } from '@/lib/types'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users')
    .select('role, class_id, classes(name, code, color, stage)')
    .eq('id', user.id)
    .single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as {
    name: string; code: string; color: string; stage: Stage
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
