import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getClassFacilityUses } from '@/lib/facilityUses'
import FacilityUseReview from '@/components/FacilityUseReview'
import FacilityManager from './FacilityManager'

export default async function AdminFacilitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { data: facilities } = await supabase
    .from('facilities').select('id, name, unit, price').eq('class_id', me.class_id).order('created_at')

  const uses = await getClassFacilityUses(supabase, me.class_id!)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/home" className="text-gray-400 text-sm mb-4 inline-block">← 교사 홈</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">🏪 시설 신청 결재</h1>
        <p className="text-sm text-gray-400 mb-5">
          시설을 등록하고, 회사들의 사용 신청을 승인·반려해요. <b>승인하면 회사 잔액에서 차감</b>돼요.
        </p>

        <FacilityManager initial={facilities ?? []} />

        <div className="font-bold text-gray-800 mb-2 px-1">📋 회사들의 시설 사용 신청</div>
        <FacilityUseReview uses={uses} />
      </div>
    </div>
  )
}
