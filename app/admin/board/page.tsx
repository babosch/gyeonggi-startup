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

  const classId = me.class_id

  const [{ data: companies }, { data: reports }, { data: concepts }, { data: students }, { count: worklogs }] =
    await Promise.all([
      supabase.from('companies').select('id, display_name, icon, balance').eq('class_id', classId),
      supabase.from('inspection_reports')
        .select('company_id, progress_status, observation, note_to_mayor, alert_delivered, created_at, users(number, nickname)')
        .eq('class_id', classId).order('created_at', { ascending: false }).limit(30),
      supabase.from('concept_responses').select('kind, is_correct').eq('class_id', classId),
      supabase.from('users').select('id, number, nickname, role').eq('class_id', classId).neq('role', 'mayor').order('number'),
      supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('class_id', classId).eq('action', 'worklog'),
    ])

  // 개념 정답률 집계
  const conceptStats: Record<string, { correct: number; total: number }> = {}
  for (const c of concepts ?? []) {
    const s = conceptStats[c.kind] ?? { correct: 0, total: 0 }
    s.total++; if (c.is_correct) s.correct++
    conceptStats[c.kind] = s
  }

  return (
    <BoardView
      cityName={cls.name}
      stageLabel={STAGE_LABELS[cls.stage]}
      alertPct={cls.budget_alert_pct}
      grant={GRANT_AMOUNT}
      companies={companies ?? []}
      reports={(reports ?? []) as any}
      conceptStats={conceptStats}
      students={students ?? []}
      worklogCount={worklogs ?? 0}
    />
  )
}
