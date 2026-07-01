import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminPayrollView from './AdminPayrollView'
import { PAYROLL_TOTAL_MAX, PAYROLL_DAILY_MAX } from '@/lib/constants'

function todayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function todayStartUTC() {
  return new Date(todayKST() + 'T00:00:00+09:00').toISOString()
}

export default async function AdminPayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon').eq('class_id', me.class_id).order('created_at')
  const comps = companies ?? []
  const compIds = comps.map(c => c.id)

  const { data: members } = compIds.length
    ? await supabase.from('users').select('id, number, nickname, role, company_id')
        .in('company_id', compIds).in('role', ['ceo', 'staff']).order('role').order('number')
    : { data: [] }
  const mem = members ?? []
  const memberIds = mem.map(m => m.id)

  const today = todayKST()
  const todayStart = todayStartUTC()

  // 지급 횟수
  const totalPaidMap: Record<string, number> = {}
  const todayPaidMap: Record<string, number> = {}
  for (const id of memberIds) {
    const { count: total } = await supabase.from('transactions')
      .select('*', { count: 'exact', head: true }).like('idempotency_key', `payroll:${id}:%`)
    totalPaidMap[id] = total ?? 0
    const { count: todayCnt } = await supabase.from('transactions')
      .select('*', { count: 'exact', head: true }).like('idempotency_key', `payroll:${id}:${today}:%`)
    todayPaidMap[id] = todayCnt ?? 0
  }

  // 오늘 업무일지
  const { data: logs } = memberIds.length
    ? await supabase.from('activity_logs').select('id, user_id, payload, status, feedback, created_at')
        .in('user_id', memberIds).eq('action', 'worklog').gte('created_at', todayStart)
        .order('created_at', { ascending: true })
    : { data: [] }
  const worklogsMap: Record<string, { id: string; text: string; status: string; feedback: string | null; created_at: string }[]> = {}
  for (const log of logs ?? []) {
    ;(worklogsMap[log.user_id] ??= []).push({
      id: log.id, text: (log.payload as { text?: string })?.text ?? '',
      status: (log.status as string) ?? 'submitted',
      feedback: (log.feedback as string | null) ?? null, created_at: log.created_at,
    })
  }

  const companyData = comps.map(c => ({
    id: c.id, name: c.display_name, icon: c.icon as string | null,
    members: mem.filter(m => m.company_id === c.id).map(m => ({
      id: m.id, number: m.number, nickname: m.nickname, role: m.role,
      worklogs: worklogsMap[m.id] ?? [],
      totalPaid: totalPaidMap[m.id] ?? 0, todayPaid: todayPaidMap[m.id] ?? 0,
    })),
  }))

  return <AdminPayrollView companies={companyData} totalMax={PAYROLL_TOTAL_MAX} dailyMax={PAYROLL_DAILY_MAX} />
}
