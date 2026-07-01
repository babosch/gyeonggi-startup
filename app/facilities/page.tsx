import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import FacilitiesView from './FacilitiesView'
import { getClassFacilityUses } from '@/lib/facilityUses'
import type { Stage } from '@/lib/types'

export default async function FacilitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('facilities')) return <ActivityLocked activityKey="facilities" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, class_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  const { data: facilities } = await supabase
    .from('facilities').select('*').eq('class_id', me.class_id).order('created_at')

  let companyBalance = 0
  if (me.role === 'ceo' && me.company_id) {
    const { data: c } = await supabase.from('companies').select('balance').eq('id', me.company_id).single()
    companyBalance = c?.balance ?? 0
  }

  let cityBalance = 0
  if (me.role === 'officer') {
    const { data: a } = await supabase.from('accounts').select('balance')
      .eq('owner_type', 'city').eq('owner_id', me.class_id).maybeSingle()
    cityBalance = a?.balance ?? 0
  }

  // 시설 사용 신청 목록 — 공무원은 반 전체, CEO는 내 회사
  let uses: Awaited<ReturnType<typeof getClassFacilityUses>> = []
  if (me.role === 'officer') {
    uses = await getClassFacilityUses(supabase, me.class_id!)
  } else if (me.role === 'ceo' && me.company_id) {
    uses = await getClassFacilityUses(supabase, me.class_id!, me.company_id)
  }

  return (
    <FacilitiesView
      stage={cls.stage} role={me.role} facilities={facilities ?? []}
      companyBalance={companyBalance} cityBalance={cityBalance} uses={uses}
    />
  )
}
