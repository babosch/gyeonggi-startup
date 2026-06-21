import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardView from './BoardView'
import { GRANT_AMOUNT } from '@/lib/constants'
import { STAGE_LABELS, type Stage } from '@/lib/types'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(name, stage, budget_alert_pct)').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as {
    name: string; stage: Stage; budget_alert_pct: number
  }
  const classId = me.class_id!

  // ── 1단계: 회사 목록 (다른 쿼리의 입력값으로 필요) ──────────
  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon, balance').eq('class_id', classId)

  const companyIds = (companies ?? []).map(c => c.id)

  // ── 2단계: 나머지 데이터 병렬 조회 ───────────────────────────
  const [
    { data: students },
    { data: conceptRows },
    { data: activityLogs },
    { data: reports },
    { data: businessPlans },
    { data: jobApps },
  ] = await Promise.all([
    supabase.from('users').select('id, number, nickname, role, company_id')
      .eq('class_id', classId).neq('role', 'mayor').order('number'),
    // 개념 응답: user_id별로 필요
    supabase.from('concept_responses').select('user_id, kind, is_correct, created_at').eq('class_id', classId),
    // 활동 로그: 최근 순, 최대 500건 (마지막 활동시간 + 업무일지 카운트용)
    supabase.from('activity_logs')
      .select('user_id, action, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false })
      .limit(500),
    // 공무원 시찰 보고서
    supabase.from('inspection_reports')
      .select('id, company_id, progress_status, observation, note_to_mayor, alert_delivered, created_at, users(number, nickname)')
      .eq('class_id', classId).order('created_at', { ascending: false }).limit(30),
    // 사업계획서 (창업 단계 완료 체크용)
    supabase.from('business_plans').select('user_id, created_at').eq('class_id', classId).limit(200),
    // 채용 지원서 (창업 단계 완료 체크용)
    companyIds.length
      ? supabase.from('job_applications').select('applicant_id, status').in('company_id', companyIds).limit(200)
      : { data: [] as { applicant_id: string; status: string }[] },
  ])

  // 교류 카드 — 테이블이 없을 수 있으므로 try/catch
  let exchangeCardCompanyIds = new Set<string>()
  try {
    const { data: cards } = await supabase
      .from('exchange_cards').select('company_id').eq('class_id', classId)
    for (const c of cards ?? []) exchangeCardCompanyIds.add(c.company_id)
  } catch { /* exchange_cards 테이블 없는 경우 무시 */ }

  // ── 학생 활동 집계 ────────────────────────────────────────

  // 마지막 활동 시각 per student
  const lastActivityMap: Record<string, string> = {}
  const worklogCountMap: Record<string, number> = {}
  for (const log of activityLogs ?? []) {
    if (!lastActivityMap[log.user_id]) lastActivityMap[log.user_id] = log.created_at
    if (log.action === 'worklog') {
      worklogCountMap[log.user_id] = (worklogCountMap[log.user_id] ?? 0) + 1
    }
  }

  // 사업계획서 작성 여부
  const hasBusinessPlanSet = new Set((businessPlans ?? []).map(p => p.user_id))

  // 채용 지원서 제출 여부 (applicant_id)
  const hasAppliedSet = new Set((jobApps ?? []).map(a => a.applicant_id))

  // 퀴즈 응답 수 + 개념 매트릭스 per student
  const quizCountMap: Record<string, number> = {}
  const conceptMatrix: Record<string, Record<string, 'correct' | 'wrong'>> = {}
  for (const r of conceptRows ?? []) {
    quizCountMap[r.user_id] = (quizCountMap[r.user_id] ?? 0) + 1
    if (!conceptMatrix[r.user_id]) conceptMatrix[r.user_id] = {}
    const existing = conceptMatrix[r.user_id][r.kind]
    if (existing !== 'correct') {
      conceptMatrix[r.user_id][r.kind] = r.is_correct ? 'correct' : 'wrong'
    }
  }

  // 어떤 concept kind들이 응답됐는지 전체 수집
  const allConceptKinds = [...new Set((conceptRows ?? []).map(r => r.kind))]

  // ── 회사 정보 강화 ────────────────────────────────────────
  const companyEnhanced = (companies ?? []).map(c => {
    const ceo = (students ?? []).find(s => s.company_id === c.id && s.role === 'ceo')
    const staffList = (students ?? []).filter(s => s.company_id === c.id && s.role === 'staff')
    return {
      id: c.id,
      name: c.display_name,
      icon: c.icon,
      balance: c.balance,
      ceoName: ceo ? (ceo.nickname ?? `${ceo.number}번`) : null,
      ceoId: ceo?.id ?? null,
      staffNames: staffList.map(s => s.nickname ?? `${s.number}번`),
    }
  })

  // ── 보고서 정보 강화 ─────────────────────────────────────
  // companyNameMap: 학생 카드에서 이름만 표시 (이모지 없음)
  const companyNameMap: Record<string, string> = Object.fromEntries(
    (companies ?? []).map(c => [c.id, c.display_name])
  )
  // companyDisplayMap: 보고서/요약에서 아이콘+이름 표시
  const companyDisplayMap: Record<string, string> = Object.fromEntries(
    (companies ?? []).map(c => [c.id, `${c.icon} ${c.display_name}`])
  )
  const reportsEnhanced = (reports ?? []).map(r => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    return {
      id: r.id as string,
      companyId: r.company_id,
      companyName: r.company_id ? (companyDisplayMap[r.company_id] ?? '-') : '-',
      officerName: u ? (u.nickname ?? `${u.number}번`) : '알 수 없음',
      progressStatus: r.progress_status,
      observation: r.observation,
      noteToMayor: r.note_to_mayor,
      alertDelivered: r.alert_delivered,
      createdAt: r.created_at,
    }
  })

  // ── 학생 활동 데이터 ─────────────────────────────────────
  const studentActivities = (students ?? []).map(s => {
    const companyHasCard = s.company_id ? exchangeCardCompanyIds.has(s.company_id) : false
    return {
      id: s.id,
      number: s.number,
      nickname: s.nickname,
      role: s.role,
      companyId: s.company_id,
      companyName: s.company_id ? (companyNameMap[s.company_id] ?? null) : null,
      lastActivityAt: lastActivityMap[s.id] ?? null,
      worklogCount: worklogCountMap[s.id] ?? 0,
      quizCount: quizCountMap[s.id] ?? 0,
      hasBusinessPlan: hasBusinessPlanSet.has(s.id),
      hasApplied: hasAppliedSet.has(s.id),
      hasExchangeCard: companyHasCard,
    }
  })

  return (
    <BoardView
      cityName={cls.name}
      stage={cls.stage}
      stageLabel={STAGE_LABELS[cls.stage]}
      alertPct={cls.budget_alert_pct ?? 20}
      grant={GRANT_AMOUNT}
      classId={classId}
      companies={companyEnhanced}
      reports={reportsEnhanced}
      students={studentActivities}
      conceptMatrix={conceptMatrix}
      allConceptKinds={allConceptKinds}
    />
  )
}
