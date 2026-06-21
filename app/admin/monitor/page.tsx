import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MonitorView from './MonitorView'

export default async function MonitorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(name, stage)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string; stage: number }

  // 모든 학생 (역할·회사·잔액 포함)
  const { data: students } = await supabase
    .from('users')
    .select('id, number, nickname, role, company_id')
    .eq('class_id', me.class_id)
    .neq('role', 'mayor')
    .order('number')

  // 회사 목록
  const { data: companies } = await supabase
    .from('companies')
    .select('id, display_name, icon, balance')
    .eq('class_id', me.class_id)
    .order('created_at')

  // 각 학생 계좌 잔액
  const studentIds = (students ?? []).map(s => s.id)
  const { data: userAccounts } = await supabase
    .from('accounts')
    .select('owner_id, balance')
    .eq('owner_type', 'user')
    .in('owner_id', studentIds.length ? studentIds : ['_'])

  const balanceMap: Record<string, number> = Object.fromEntries(
    (userAccounts ?? []).map(a => [a.owner_id, a.balance])
  )

  // 채용 지원서 (학생 정보 포함)
  const { data: applications } = await supabase
    .from('job_applications')
    .select('id, company_id, applicant_id, motivation, status, created_at, users!applicant_id(number, nickname)')
    .in('company_id', (companies ?? []).map(c => c.id).length ? (companies ?? []).map(c => c.id) : ['_'])
    .order('created_at', { ascending: false })

  // 최근 거래 내역 (50건)
  const companyAccounts = await supabase
    .from('accounts')
    .select('id, owner_id')
    .eq('owner_type', 'company')
    .in('owner_id', (companies ?? []).map(c => c.id).length ? (companies ?? []).map(c => c.id) : ['_'])

  const userAccountIds = (userAccounts ?? []).map(a => a.owner_id)
  const companyAccountIds = (companyAccounts.data ?? []).map(a => a.id)
  const allAccountIds = [...(userAccounts ?? []).map(a => a.owner_id), ...companyAccountIds]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, from_account_id, to_account_id, amount, type, memo, voided, created_at')
    .or(
      allAccountIds.length
        ? allAccountIds.map(id => `from_account_id.eq.${id},to_account_id.eq.${id}`).join(',')
        : 'id.eq._'
    )
    .order('created_at', { ascending: false })
    .limit(60)

  // 퀴즈(쪽지시험) 응답 — concept_responses에 class_id 있음
  const { data: quizRows } = await supabase
    .from('concept_responses')
    .select('user_id, kind, is_correct')
    .eq('class_id', me.class_id!)

  const quizCountMap: Record<string, Record<string, { total: number; correct: number }>> = {}
  for (const r of quizRows ?? []) {
    if (!quizCountMap[r.user_id]) quizCountMap[r.user_id] = {}
    if (!quizCountMap[r.user_id][r.kind]) quizCountMap[r.user_id][r.kind] = { total: 0, correct: 0 }
    quizCountMap[r.user_id][r.kind].total++
    if (r.is_correct) quizCountMap[r.user_id][r.kind].correct++
  }

  // 성찰 건수 — reflections는 class_id 없으므로 user_id로 필터
  const { data: reflectRows } = studentIds.length
    ? await supabase.from('reflections').select('user_id').in('user_id', studentIds)
    : { data: [] }

  const reflectCountMap: Record<string, number> = {}
  for (const r of reflectRows ?? []) {
    reflectCountMap[r.user_id] = (reflectCountMap[r.user_id] ?? 0) + 1
  }

  // 업무일지 건수 — activity_logs에 class_id 있음
  const { data: worklogRows } = await supabase
    .from('activity_logs')
    .select('user_id')
    .eq('class_id', me.class_id!)
    .eq('action', 'worklog')

  const worklogCountMap: Record<string, number> = {}
  for (const r of worklogRows ?? []) {
    worklogCountMap[r.user_id] = (worklogCountMap[r.user_id] ?? 0) + 1
  }

  // account_id → 소유자 이름 매핑 빌드
  const accountOwnerMap: Record<string, string> = {}
  for (const s of students ?? []) {
    const acctId = (userAccounts ?? []).find(a => a.owner_id === s.id)?.owner_id
    if (acctId) accountOwnerMap[acctId] = s.nickname ?? `${s.number}번`
  }
  for (const c of companies ?? []) {
    const acctId = (companyAccounts.data ?? []).find(a => a.owner_id === c.id)?.id
    if (acctId) accountOwnerMap[acctId] = `${c.icon} ${c.display_name}`
  }

  const companyMap: Record<string, string> = Object.fromEntries(
    (companies ?? []).map(c => [c.id, `${c.icon} ${c.display_name}`])
  )

  return (
    <MonitorView
      cityName={cls.name}
      stage={cls.stage}
      classId={me.class_id!}
      students={(students ?? []).map(s => ({
        id: s.id,
        number: s.number,
        nickname: s.nickname,
        role: s.role,
        companyId: s.company_id,
        companyName: s.company_id ? (companyMap[s.company_id] ?? null) : null,
        balance: balanceMap[s.id] ?? 0,
      }))}
      companies={(companies ?? []).map(c => ({
        id: c.id,
        name: `${c.icon} ${c.display_name}`,
        balance: c.balance,
        ceo: (students ?? []).find(s => s.company_id === c.id && s.role === 'ceo')?.nickname
          ?? `${(students ?? []).find(s => s.company_id === c.id && s.role === 'ceo')?.number ?? '?'}번`,
        staffCount: (students ?? []).filter(s => s.company_id === c.id && s.role === 'staff').length,
      }))}
      applications={(applications ?? []).map(a => {
        const u = Array.isArray(a.users) ? a.users[0] : a.users
        return {
          id: a.id,
          companyId: a.company_id,
          companyName: companyMap[a.company_id] ?? '-',
          applicantId: a.applicant_id,
          applicantName: u ? (u.nickname ?? `${u.number}번`) : '-',
          motivation: a.motivation,
          status: a.status,
          createdAt: a.created_at,
        }
      })}
      quizCountMap={quizCountMap}
      reflectCountMap={reflectCountMap}
      worklogCountMap={worklogCountMap}
      transactions={(transactions ?? []).map(t => ({
        id: t.id,
        fromName: t.from_account_id ? (accountOwnerMap[t.from_account_id] ?? t.from_account_id.slice(0, 8)) : '정부',
        toName: t.to_account_id ? (accountOwnerMap[t.to_account_id] ?? t.to_account_id.slice(0, 8)) : '정부',
        amount: t.amount,
        type: t.type,
        memo: t.memo ?? '',
        voided: t.voided,
        createdAt: t.created_at,
      }))}
    />
  )
}
