import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IntroSlides from './IntroSlides'
import type { Role } from '@/lib/types'

export default async function IntroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, intro_seen, classes(color)').eq('id', user.id).single()
  if (!me) redirect('/home')
  if (me.intro_seen) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { color: string }

  return <IntroSlides role={me.role as Role} color={cls.color} />
}
