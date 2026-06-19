import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubmissionsView from './SubmissionsView'

export default async function SubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const classId = me.class_id

  const [{ data: plans }, { data: research }, { data: reflections }] = await Promise.all([
    supabase.from('business_plans')
      .select('id, content, status, feedback, users(number, nickname)')
      .eq('class_id', classId).order('submitted_at', { ascending: false }),
    supabase.from('city_research')
      .select('id, specialties, strengths, oneliner, feedback, users(number, nickname)')
      .eq('class_id', classId).order('created_at', { ascending: false }),
    supabase.from('reflections')
      .select('id, answer, mood, stage, feedback, users(number, nickname)')
      .in('user_id', (await supabase.from('users').select('id').eq('class_id', classId)).data?.map(u => u.id) ?? [])
      .order('created_at', { ascending: false }).limit(40),
  ])

  return (
    <SubmissionsView
      plans={(plans ?? []) as any}
      research={(research ?? []) as any}
      reflections={(reflections ?? []) as any}
    />
  )
}
