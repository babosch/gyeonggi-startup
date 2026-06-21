import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResetPinView from './ResetPinView'

export default async function ResetPinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/home')

  const { data: students } = await supabase
    .from('users')
    .select('id, number, nickname, role')
    .eq('class_id', me.class_id!)
    .neq('role', 'mayor')
    .order('number')

  return <ResetPinView students={students ?? []} />
}
