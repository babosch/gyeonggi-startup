import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GrantView from './GrantView'

export default async function AdminGrantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon, balance')
    .eq('class_id', me.class_id).order('created_at')

  return <GrantView companies={companies ?? []} />
}
