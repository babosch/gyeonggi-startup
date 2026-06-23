import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import RequisitionForm from './RequisitionForm'
import type { Stage } from '@/lib/types'

export default async function RequisitionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('requisition')) return <ActivityLocked activityKey="requisition" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'ceo' || !me.company_id) {
    return <RequisitionForm stage={cls.stage} notCeo balance={0} past={[]} />
  }

  const { data: company } = await supabase.from('companies').select('balance').eq('id', me.company_id).single()

  // 임시저장(draft) 1건 — 폼에 불러와 이어 작성
  const { data: draft } = await supabase
    .from('requisitions').select('id, items, dropped_items, status')
    .eq('company_id', me.company_id).eq('status', 'draft')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  // 제출 내역 (draft 제외)
  const { data: past } = await supabase
    .from('requisitions').select('id, items, dropped_items, total, status, feedback, created_at')
    .eq('company_id', me.company_id).neq('status', 'draft')
    .order('created_at', { ascending: false }).limit(5)

  return <RequisitionForm stage={cls.stage} balance={company?.balance ?? 0} past={past ?? []} draft={draft ?? null} />
}
