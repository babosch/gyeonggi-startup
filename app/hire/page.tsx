import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import HireList from './HireList'
import { MAX_STAFF_PER_COMPANY } from '@/lib/constants'
import type { Stage } from '@/lib/types'

export default async function HirePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('hire')) return <ActivityLocked activityKey="hire" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, class_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'ceo' || !me.company_id) {
    return <HireList stage={cls.stage} notCeo applications={[]} staff={[]} maxStaff={MAX_STAFF_PER_COMPANY} />
  }

  // 이 회사에 지원한 지원서 목록 (지원자 정보 포함)
  const { data: applications } = await supabase
    .from('job_applications')
    .select('id, applicant_id, motivation, status, users(id, number, nickname)')
    .eq('company_id', me.company_id)
    .order('created_at')

  const { data: staff } = await supabase
    .from('users').select('id, number, nickname')
    .eq('company_id', me.company_id).eq('role', 'staff').order('number')

  return (
    <HireList
      stage={cls.stage}
      applications={(applications ?? []).map(a => ({
        id: a.id,
        applicantId: a.applicant_id,
        motivation: a.motivation,
        status: a.status,
        user: Array.isArray(a.users) ? a.users[0] : a.users,
      }))}
      staff={staff ?? []}
      maxStaff={MAX_STAFF_PER_COMPANY}
    />
  )
}
