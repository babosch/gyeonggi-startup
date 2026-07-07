import type { SupabaseClient } from '@supabase/supabase-js'

// 현재 단계의 탐구 질문 답이 '반려된 채 미해결'인지 확인한다.
// (가장 최근 응답이 반려면 미해결 → 학생이 다시 써서 미반려 응답을 넣으면 해소)
export async function currentStageInquiryStatus(
  supabase: SupabaseClient, userId: string, stage: number,
): Promise<{ rejected: boolean; reason: string | null }> {
  if (stage < 2) return { rejected: false, reason: null }
  const { data: latest } = await supabase
    .from('reflections')
    .select('rejected, feedback')
    .eq('user_id', userId).eq('stage', stage).not('concept_key', 'is', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const rejected = !!latest?.rejected
  return { rejected, reason: rejected ? ((latest?.feedback as string | null) ?? null) : null }
}
