import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import WorklogForm from './WorklogForm'
import { inquiryForStage, KEYWORD_DEFS } from '@/lib/inquiry'
import type { Stage } from '@/lib/types'

function todayStartUTC() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return new Date(kst + 'T00:00:00+09:00').toISOString()
}

export default async function WorklogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('worklog')) return <ActivityLocked activityKey="worklog" />

  const { data: me } = await supabase
    .from('users').select('role, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  // 오늘 업무일지 (상태 포함)
  const { data: today } = await supabase
    .from('activity_logs').select('id, payload, status, feedback, created_at')
    .eq('user_id', user.id).eq('action', 'worklog')
    .gte('created_at', todayStartUTC())
    .order('created_at', { ascending: true })

  // 최초 작성 여부 (개념 팝업용)
  const { count: everCount } = await supabase
    .from('activity_logs').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('action', 'worklog')

  const todayLogs = (today ?? []).map(t => ({
    id: t.id as string,
    text: (t.payload as { text?: string })?.text ?? '',
    status: (t.status as string) ?? 'submitted',
    feedback: (t.feedback as string | null) ?? null,
    created_at: t.created_at as string,
  }))

  // 탐구 질문 게이트 — 생산(2단계) 이상.
  //  - 질문 순환: 반려 안 된 응답 수 기준 (반려된 건 세지 않아 재작성 시 같은 질문)
  //  - 통과: 오늘 반려 안 된 응답이 있으면 (가장 최근 응답이 오늘·미반려)
  //  - 반려됨: 마지막 응답이 반려면 같은 질문 + 사유 다시 표시
  const stage = cls.stage
  let inquiry: null | {
    id: string; question: string
    keywords: { word: string; def: string; required: boolean }[]
  } = null
  let inquiryAnswered = true
  let rejectionReason: string | null = null
  if (stage >= 2) {
    const { count: nonRejectedAll } = await supabase
      .from('reflections').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('stage', stage).not('concept_key', 'is', null).eq('rejected', false)
    const { data: latest } = await supabase
      .from('reflections').select('rejected, feedback, created_at')
      .eq('user_id', user.id).eq('stage', stage).not('concept_key', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    const q = inquiryForStage(stage, nonRejectedAll ?? 0)
    if (q) {
      inquiry = {
        id: q.id, question: q.question,
        keywords: [
          { word: q.required, def: KEYWORD_DEFS[q.required] ?? '', required: true },
          ...q.recommended.map(w => ({ word: w, def: KEYWORD_DEFS[w] ?? '', required: false })),
        ],
      }
      const answeredToday = !!latest && !latest.rejected &&
        new Date(latest.created_at).getTime() >= new Date(todayStartUTC()).getTime()
      inquiryAnswered = answeredToday
      rejectionReason = latest?.rejected ? (latest.feedback ?? '자세히 다시 써주세요') : null
    }
  }

  return (
    <WorklogForm
      stage={cls.stage} role={me.role} today={todayLogs} firstEver={(everCount ?? 0) === 0}
      inquiry={inquiry} inquiryAnswered={inquiryAnswered} rejectionReason={rejectionReason}
    />
  )
}
