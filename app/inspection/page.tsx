import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InspectionForm from './InspectionForm'
import { GRANT_AMOUNT } from '@/lib/constants'
import type { Stage } from '@/lib/types'

export default async function InspectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(stage, budget_alert_pct)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage; budget_alert_pct: number }

  if (me.role !== 'officer') {
    return <InspectionForm stage={cls.stage} notOfficer companies={[]} reports={[]} alertPct={30} />
  }

  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon, balance').eq('class_id', me.class_id)

  const { data: reports } = await supabase
    .from('inspection_reports').select('company_id, progress_status, created_at')
    .eq('officer_id', user.id).order('created_at', { ascending: false }).limit(10)

  return (
    <InspectionForm
      stage={cls.stage}
      companies={companies ?? []}
      reports={reports ?? []}
      alertPct={cls.budget_alert_pct}
      grant={GRANT_AMOUNT}
    />
  )
}
