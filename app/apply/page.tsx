import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApplyView from './ApplyView'

export default async function ApplyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me) redirect('/home')
  if (me.role !== 'applicant') redirect('/home')

  // 이 반에서 선정된 회사 목록
  const { data: companies } = await supabase
    .from('companies')
    .select('id, display_name')
    .eq('class_id', me.class_id)
    .order('created_at')

  // 각 회사의 사업계획서 (최신 selected 상태)
  const { data: plans } = await supabase
    .from('business_plans')
    .select('company_id, content')
    .eq('class_id', me.class_id)
    .eq('status', 'selected')

  // 내 지원 현황
  const { data: myApps } = await supabase
    .from('job_applications')
    .select('id, company_id, motivation, status')
    .eq('applicant_id', user.id)

  const planMap: Record<string, { salesItems?: { name: string; qty: number; price: number }[]; whatToSell?: string; target?: string; reason?: string }> =
    Object.fromEntries((plans ?? []).map(p => [p.company_id, p.content]))

  return (
    <ApplyView
      companies={(companies ?? []).map(c => ({
        ...c,
        plan: planMap[c.id] ?? null,
      }))}
      myApps={myApps ?? []}
    />
  )
}
