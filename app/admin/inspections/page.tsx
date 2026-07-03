import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InspectionsView from './InspectionsView'

export default async function AdminInspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')
  const classId = me.class_id!

  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon').eq('class_id', classId)
  const companyDisplayMap: Record<string, string> = Object.fromEntries(
    (companies ?? []).map(c => [c.id, `${c.icon} ${c.display_name}`])
  )

  const { data: reports } = await supabase
    .from('inspection_reports')
    .select('id, company_id, progress_status, observation, note_to_mayor, alert_delivered, created_at, users(number, nickname)')
    .eq('class_id', classId).order('created_at', { ascending: false }).limit(50)

  const reportsEnhanced = (reports ?? []).map(r => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    return {
      id: r.id as string,
      companyName: r.company_id ? (companyDisplayMap[r.company_id] ?? '-') : '-',
      officerName: u ? (u.nickname ?? `${u.number}번`) : '알 수 없음',
      progressStatus: (r.progress_status as string | null) ?? null,
      observation: (r.observation as string | null) ?? null,
      noteToMayor: (r.note_to_mayor as string | null) ?? null,
      alertDelivered: !!r.alert_delivered,
      createdAt: r.created_at as string,
    }
  })

  return <InspectionsView reports={reportsEnhanced} />
}
