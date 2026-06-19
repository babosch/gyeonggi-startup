import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReflectForm from './ReflectForm'
import type { Stage } from '@/lib/types'

export default async function ReflectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('classes(stage)').eq('id', user.id).single()
  const cls = (Array.isArray(me?.classes) ? me?.classes[0] : me?.classes) as { stage: Stage } | undefined

  const { data: past } = await supabase
    .from('reflections').select('answer, mood, feedback, created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)

  return <ReflectForm stage={cls?.stage ?? 0} past={past ?? []} />
}
