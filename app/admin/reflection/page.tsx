import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReflectionMonitorView from './ReflectionMonitorView'

export interface MonitorStudent {
  id: string
  number: number
  nickname: string | null
  role: string
  companyName: string | null
}
export interface MonitorResponse { user_id: string; tab_id: string; field_id: string; value: unknown }

export default async function ReflectionMonitorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(name)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string }

  const admin = createAdminClient()

  const { data: students } = await admin
    .from('users').select('id, number, nickname, role, company_id')
    .eq('class_id', me.class_id).neq('role', 'mayor').order('number')
  const studentList = students ?? []

  const companyIds = [...new Set(studentList.map(s => s.company_id).filter(Boolean))] as string[]
  const { data: companies } = companyIds.length
    ? await admin.from('companies').select('id, display_name').in('id', companyIds)
    : { data: [] as { id: string; display_name: string }[] }
  const nameByCompany: Record<string, string> = Object.fromEntries((companies ?? []).map(c => [c.id, c.display_name]))

  const { data: responses } = await admin
    .from('reflection_responses').select('user_id, tab_id, field_id, value').eq('class_id', me.class_id)

  const { data: statusRows } = await admin
    .from('reflection_tab_status').select('user_id, tab_id, submitted').eq('class_id', me.class_id)
  const submitted: Record<string, Record<string, boolean>> = {}
  for (const s of statusRows ?? []) {
    if (!submitted[s.user_id]) submitted[s.user_id] = {}
    submitted[s.user_id][s.tab_id] = s.submitted
  }

  return (
    <ReflectionMonitorView
      cityName={cls.name}
      classId={me.class_id!}
      students={studentList.map(s => ({
        id: s.id, number: s.number, nickname: s.nickname, role: s.role,
        companyName: s.company_id ? (nameByCompany[s.company_id] ?? null) : null,
      }))}
      initialResponses={(responses ?? []) as MonitorResponse[]}
      initialSubmitted={submitted}
    />
  )
}
