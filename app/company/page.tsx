import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import CompanyManager from './CompanyManager'
import type { Stage } from '@/lib/types'

export default async function CompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('company')) return <ActivityLocked activityKey="company" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'ceo' || !me.company_id) {
    return <CompanyManager stage={cls.stage} company={null} products={[]} notCeo />
  }

  const { data: company } = await supabase
    .from('companies').select('id, display_name, icon, balance').eq('id', me.company_id).single()
  const { data: products } = await supabase
    .from('products').select('*').eq('company_id', me.company_id).order('created_at')

  return <CompanyManager stage={cls.stage} company={company} products={products ?? []} />
}
