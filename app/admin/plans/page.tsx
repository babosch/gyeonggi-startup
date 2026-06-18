import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PlanReview from './PlanReview'

export default async function AdminPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: plans } = await supabase
    .from('business_plans')
    .select('id, user_id, content, reserve_amount, status, users(number, nickname)')
    .eq('class_id', me.class_id)
    .in('status', ['submitted', 'selected'])
    .order('submitted_at', { ascending: true })

  const { count } = await supabase
    .from('companies').select('id', { count: 'exact', head: true }).eq('class_id', me.class_id)

  return <PlanReview plans={plans ?? []} selectedCount={count ?? 0} />
}
