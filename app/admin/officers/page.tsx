import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OfficerManager from './OfficerManager'

export default async function OfficersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: applicants } = await supabase
    .from('users').select('id, number, nickname').eq('class_id', me.class_id).eq('role', 'applicant').order('number')
  const { data: officers } = await supabase
    .from('users').select('id, number, nickname').eq('class_id', me.class_id).eq('role', 'officer').order('number')

  return <OfficerManager applicants={applicants ?? []} officers={officers ?? []} />
}
