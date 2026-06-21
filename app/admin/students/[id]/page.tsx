import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudentDetailView from './StudentDetailView'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: mayor } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!mayor || mayor.role !== 'mayor') redirect('/admin')

  const { data: student } = await supabase
    .from('users')
    .select('id, number, nickname, role, company_id, companies(display_name, icon)')
    .eq('id', id).single()
  if (!student || student.class_id !== mayor.class_id) notFound()

  const company = Array.isArray(student.companies) ? student.companies[0] : student.companies

  // 계좌 잔액
  const { data: acct } = await supabase
    .from('accounts').select('id, balance')
    .eq('owner_type', 'user').eq('owner_id', id).maybeSingle()

  // 이 학생의 거래 내역 (구매)
  const { data: txHistory } = acct ? await supabase
    .from('transactions')
    .select('id, from_account_id, to_account_id, amount, type, memo, voided, created_at')
    .or(`from_account_id.eq.${acct.id},to_account_id.eq.${acct.id}`)
    .order('created_at', { ascending: false })
    .limit(30) : { data: [] }

  // 사업계획서
  const { data: plans } = await supabase
    .from('business_plans')
    .select('id, content, status, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  // 지원서 현황
  const { data: myApps } = await supabase
    .from('job_applications')
    .select('id, company_id, motivation, status, created_at, companies(display_name, icon)')
    .eq('applicant_id', id)
    .order('created_at', { ascending: false })

  // 업무일지
  const { data: worklogs } = await supabase
    .from('worklogs')
    .select('id, content, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 성찰
  const { data: reflections } = await supabase
    .from('reflections')
    .select('id, content, stage, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 퀴즈
  const { data: quizzes } = await supabase
    .from('concept_answers')
    .select('id, kind, correct, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <StudentDetailView
      student={{
        id: student.id,
        number: student.number,
        nickname: student.nickname,
        role: student.role,
        balance: acct?.balance ?? 0,
        companyName: company ? `${company.icon} ${company.display_name}` : null,
      }}
      transactions={(txHistory ?? []).map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        memo: t.memo ?? '',
        direction: t.from_account_id === acct?.id ? 'out' : 'in',
        voided: t.voided,
        createdAt: t.created_at,
      }))}
      plans={(plans ?? []).map(p => ({
        id: p.id,
        companyName: (p.content as { companyName?: string })?.companyName ?? '-',
        status: p.status,
        createdAt: p.created_at,
      }))}
      applications={(myApps ?? []).map(a => {
        const c = Array.isArray(a.companies) ? a.companies[0] : a.companies
        return {
          id: a.id,
          companyName: c ? `${c.icon} ${c.display_name}` : a.company_id,
          motivation: a.motivation,
          status: a.status,
          createdAt: a.created_at,
        }
      })}
      worklogs={(worklogs ?? []).map(w => ({ id: w.id, content: w.content, createdAt: w.created_at }))}
      reflections={(reflections ?? []).map(r => ({ id: r.id, content: r.content, stage: r.stage, createdAt: r.created_at }))}
      quizzes={(quizzes ?? []).map(q => ({ id: q.id, kind: q.kind, correct: q.correct, createdAt: q.created_at }))}
    />
  )
}
