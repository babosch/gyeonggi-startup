import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, classes(name)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin/setup')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string } | null

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">관리자 홈</h1>
      <p className="text-gray-500 text-sm mb-8">{cls?.name ?? ''} 시장</p>
      <div className="flex flex-col gap-3">
        <Link href="/admin/setup"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-bold text-gray-800">학생 계정 생성</p>
            <p className="text-sm text-gray-400">반별 학생 계정 일괄 생성</p>
          </div>
        </Link>
        <Link href="/admin/plans"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">📝</span>
          <div>
            <p className="font-bold text-gray-800">사업계획서 심사</p>
            <p className="text-sm text-gray-400">제출된 계획서 선정·취소</p>
          </div>
        </Link>
        <Link href="/admin/officers"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-bold text-gray-800">공무원 임명</p>
            <p className="text-sm text-gray-400">지원자를 공무원으로</p>
          </div>
        </Link>
        <Link href="/admin/requisitions"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">🧾</span>
          <div>
            <p className="font-bold text-gray-800">품의서 결재</p>
            <p className="text-sm text-gray-400">회사 물품 구입 승인</p>
          </div>
        </Link>
        <Link href="/admin/board"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-bold text-gray-800">현황 보드</p>
            <p className="text-sm text-gray-400">반 전체 진행·시찰·경보</p>
          </div>
        </Link>
        <Link href="/home"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">🏫</span>
          <div>
            <p className="font-bold text-gray-800">단계 제어</p>
            <p className="text-sm text-gray-400">수업 단계 실시간 통제</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
