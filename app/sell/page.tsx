import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import SellBooth from './SellBooth'
import type { Stage } from '@/lib/types'

export default async function SellPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('sell')) return <ActivityLocked activityKey="sell" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if ((me.role !== 'ceo' && me.role !== 'staff') || !me.company_id) {
    return <SellBooth stage={cls.stage} notSeller products={[]} companyName="" />
  }

  const { data: company } = await supabase.from('companies').select('display_name').eq('id', me.company_id).single()
  const { data: products } = await supabase
    .from('products').select('id, name, price, stock, sold').eq('company_id', me.company_id).order('created_at')

  return <SellBooth stage={cls.stage} products={products ?? []} companyName={company?.display_name ?? ''} />
}
