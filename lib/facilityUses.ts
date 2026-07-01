import type { SupabaseClient } from '@supabase/supabase-js'
import type { FacilityUse } from '@/components/FacilityUseReview'

// 한 반의 시설 사용 신청 목록을 회사명·시설명과 함께 조립한다.
// (Supabase 조인이 불안정해 개별 쿼리로 매핑)
export async function getClassFacilityUses(
  supabase: SupabaseClient, classId: string, companyId?: string,
): Promise<FacilityUse[]> {
  const { data: facilities } = await supabase
    .from('facilities').select('id, name, unit, price').eq('class_id', classId)
  const facs = facilities ?? []
  const facIds = facs.map(f => f.id)
  if (facIds.length === 0) return []
  const facMap = Object.fromEntries(facs.map(f => [f.id, f]))

  let q = supabase.from('facility_uses')
    .select('id, facility_id, company_id, quantity, total_amount, memo, status, feedback, created_at')
    .in('facility_id', facIds)
    .order('created_at', { ascending: false })
  if (companyId) q = q.eq('company_id', companyId)
  const { data: uses } = await q
  const u = uses ?? []

  const compIds = [...new Set(u.map(x => x.company_id))]
  const { data: companies } = compIds.length
    ? await supabase.from('companies').select('id, display_name').in('id', compIds)
    : { data: [] }
  const compMap = Object.fromEntries((companies ?? []).map(c => [c.id, c.display_name]))

  return u.map(x => {
    const f = facMap[x.facility_id] as { name: string; unit: string; price: number } | undefined
    return {
      id: x.id,
      companyName: compMap[x.company_id] ?? '회사',
      facilityName: f?.name ?? '시설',
      unit: f?.unit ?? '회',
      quantity: x.quantity,
      unitPrice: f?.price ?? 0,
      totalAmount: x.total_amount,
      memo: x.memo ?? null,
      status: x.status ?? 'pending',
      feedback: x.feedback ?? null,
      createdAt: x.created_at,
    }
  })
}
