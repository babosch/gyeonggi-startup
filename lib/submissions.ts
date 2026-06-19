import { SupabaseClient } from '@supabase/supabase-js'

// 한 반의 학생 제출물(사업계획서·도시탐구·성찰)을 모아온다.
// 교사 홈·제출물 페이지 공용.
export async function getSubmissions(supabase: SupabaseClient, classId: string) {
  const { data: studentRows } = await supabase.from('users').select('id').eq('class_id', classId)
  const studentIds = (studentRows ?? []).map(u => u.id)

  const [{ data: plans }, { data: research }, { data: reflections }] = await Promise.all([
    supabase.from('business_plans')
      .select('id, content, status, feedback, users(number, nickname)')
      .eq('class_id', classId).order('submitted_at', { ascending: false }),
    supabase.from('city_research')
      .select('id, specialties, strengths, oneliner, feedback, users(number, nickname)')
      .eq('class_id', classId).order('created_at', { ascending: false }),
    supabase.from('reflections')
      .select('id, answer, mood, stage, feedback, users(number, nickname)')
      .in('user_id', studentIds.length ? studentIds : ['none'])
      .order('created_at', { ascending: false }).limit(40),
  ])

  return { plans: plans ?? [], research: research ?? [], reflections: reflections ?? [] }
}
