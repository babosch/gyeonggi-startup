import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InquiryResponsesView from './InquiryResponsesView'

export default async function AdminInquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id, classes(stage)').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')
  const stage = ((Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: number } | null)?.stage ?? 0

  // 반 학생 (reflections엔 class_id가 없어 user_id로 필터)
  const { data: studentRows } = await supabase
    .from('users').select('id, number, nickname, role').eq('class_id', me.class_id)
  const students = studentRows ?? []
  const nameMap: Record<string, string> = Object.fromEntries(
    students.map(s => [s.id, s.nickname ?? `${s.number}번`])
  )
  const studentIds = students.map(s => s.id)
  const writers = students.filter(s => ['staff', 'ceo', 'officer'].includes(s.role))

  // 오늘 현재 단계 탐구를 안 쓴 학생 (미작성)
  function todayStartUTC() {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return new Date(kst + 'T00:00:00+09:00').toISOString()
  }
  let unanswered: { id: string; name: string }[] = []
  if (stage >= 2 && writers.length) {
    const { data: todayRefl } = await supabase.from('reflections')
      .select('user_id').in('user_id', writers.map(w => w.id))
      .eq('stage', stage).not('concept_key', 'is', null).gte('created_at', todayStartUTC())
    const answeredSet = new Set((todayRefl ?? []).map(r => r.user_id))
    unanswered = writers.filter(w => !answeredSet.has(w.id))
      .map(w => ({ id: w.id, name: w.nickname ?? `${w.number}번` }))
  }

  // 탐구 질문 응답 = concept_key가 있는 reflections
  const { data: refl } = studentIds.length
    ? await supabase.from('reflections')
        .select('id, answer, stage, prompt, concept_key, feedback, rejected, user_id, created_at')
        .in('user_id', studentIds)
        .not('concept_key', 'is', null)
        .order('created_at', { ascending: false })
        .limit(400)
    : { data: [] }

  const responses = (refl ?? []).map(r => ({
    id: r.id as string,
    studentName: nameMap[r.user_id as string] ?? '학생',
    answer: (r.answer as string) ?? '',
    stage: (r.stage as number) ?? 0,
    question: (r.prompt as string) ?? '',
    concept: (r.concept_key as string) ?? '',
    feedback: (r.feedback as string | null) ?? null,
    rejected: !!(r.rejected as boolean),
    createdAt: r.created_at as string,
  }))

  return <InquiryResponsesView responses={responses} unanswered={unanswered} />
}
