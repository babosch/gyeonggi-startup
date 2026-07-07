import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InquiryResponsesView from './InquiryResponsesView'

export default async function AdminInquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  // 반 학생 (reflections엔 class_id가 없어 user_id로 필터)
  const { data: studentRows } = await supabase
    .from('users').select('id, number, nickname').eq('class_id', me.class_id)
  const students = studentRows ?? []
  const nameMap: Record<string, string> = Object.fromEntries(
    students.map(s => [s.id, s.nickname ?? `${s.number}번`])
  )
  const studentIds = students.map(s => s.id)

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

  return <InquiryResponsesView responses={responses} />
}
