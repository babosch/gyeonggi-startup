import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/superadmin'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, classes(name)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin/setup')

  const { ok: superAdmin } = await isSuperAdmin()
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string } | null

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-1">관리자 홈</h1>
      <p className="text-gray-500 text-sm mb-8">{cls?.name ?? ''} 시장</p>
      <div className="flex flex-col gap-3">
        <Link href="/home"
          className="bg-blue-600 rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:bg-blue-700 transition-colors">
          <span className="text-2xl">🏫</span>
          <div>
            <p className="font-bold text-white text-lg">교사 홈 (수업 제어)</p>
            <p className="text-sm text-blue-100">단계 전환 · 활동 열기 · 멈춤 · 학생 결과물</p>
          </div>
        </Link>
        <Link href="/admin/setup"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">👥</span>
          <div>
            <p className="font-bold text-gray-800">학생 계정 생성</p>
            <p className="text-sm text-gray-400">반별 학생 계정 일괄 생성</p>
          </div>
        </Link>
        <Link href="/admin/monitor"
          className="bg-green-600 rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:bg-green-700 transition-colors">
          <span className="text-2xl">📡</span>
          <div>
            <p className="font-bold text-white text-lg">종합 모니터링</p>
            <p className="text-sm text-green-100">학생 관리 · 채용 · 거래 · 잔액 수정</p>
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
        <Link href="/admin/officer-payroll"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">🏛️</span>
          <div>
            <p className="font-bold text-gray-800">공무원 급여 지급</p>
            <p className="text-sm text-gray-400">업무일지 확인 후 공무원 급여</p>
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
        <Link href="/admin/submissions"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">📥</span>
          <div>
            <p className="font-bold text-gray-800">학생 제출물</p>
            <p className="text-sm text-gray-400">제출물 보기·피드백</p>
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
        <Link href="/admin/trade-reports"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-bold text-gray-800">이상 거래 보고서</p>
            <p className="text-sm text-gray-400">공무원이 신고한 이상 거래</p>
          </div>
        </Link>
        <Link href="/admin/citycard"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">🏙️</span>
          <div>
            <p className="font-bold text-gray-800">도시 대표 카드</p>
            <p className="text-sm text-gray-400">탐구 결과 워드클라우드 · 묶기 · 카드 만들기</p>
          </div>
        </Link>
        {superAdmin && (
          <Link href="/admin/super"
            className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow border-2 border-gray-200">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="font-bold text-gray-800">슈퍼어드민</p>
              <p className="text-sm text-gray-400">시장·계정 정리 (전체 관리)</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
