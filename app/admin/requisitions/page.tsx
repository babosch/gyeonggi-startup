import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReqReview from './ReqReview'

export default async function AdminReqPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: companies } = await supabase.from('companies').select('id').eq('class_id', me.class_id)
  const ids = (companies ?? []).map(c => c.id)

  const { data: reqs } = await supabase
    .from('requisitions')
    .select('id, company_id, items, dropped_items, total, status, created_at, companies(display_name)')
    .in('company_id', ids.length ? ids : ['none'])
    .order('created_at', { ascending: false })

  return <ReqReview reqs={reqs ?? []} />
}
