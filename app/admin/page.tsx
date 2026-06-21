import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/superadmin'
import { APP_VERSION, BUILD_DATE, CHANGELOG } from '@/lib/version'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, classes(name, code)').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin/setup')

  const { ok: superAdmin } = await isSuperAdmin()
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string; code: string } | null

  // 시흥시(테스트 반) 교사도 슈퍼어드민 접근 허용
  const canSuper = superAdmin || cls?.code === '3643410'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <Link href="/home"
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-5 hover:text-red-600 active:scale-95 transition-all">
          <span className="text-2xl font-black">←</span>
          <span>교사 홈으로</span>
        </Link>

        <h1 className="text-xl font-bold text-gray-800 mb-1">관리자 설정</h1>
        <p className="text-gray-500 text-sm mb-6">{cls?.name ?? ''} 시장</p>

        <div className="flex flex-col gap-3">
          <Link href="/admin/setup"
            className="bg-blue-600 rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:bg-blue-700 transition-colors">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-bold text-white text-lg">학생 계정 생성</p>
              <p className="text-sm text-blue-100">반별 학생 계정 일괄 생성</p>
            </div>
          </Link>

          <Link href="/admin/reset-pin"
            className="bg-purple-600 rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:bg-purple-700 transition-colors">
            <span className="text-2xl">🔑</span>
            <div>
              <p className="font-bold text-white text-lg">학생 핀번호 초기화</p>
              <p className="text-sm text-purple-100">학생이 PIN을 잊었을 때</p>
            </div>
          </Link>

          {canSuper && (
            <Link href="/admin/super"
              className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow border-2 border-gray-200 mt-2">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="font-bold text-gray-800">슈퍼어드민</p>
                <p className="text-sm text-gray-400">시장·계정 정리 (전체 관리)</p>
              </div>
            </Link>
          )}
        </div>

        {/* 버전 정보 */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">앱 버전 정보</span>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {APP_VERSION}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">최종 업데이트: {BUILD_DATE}</p>

          <div className="flex flex-col gap-4">
            {CHANGELOG.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-gray-600">{entry.version}</span>
                  <span className="text-xs text-gray-400">{entry.date}</span>
                  {entry.version === APP_VERSION && (
                    <span className="text-xs text-green-600 font-bold">● 현재</span>
                  )}
                </div>
                <ul className="flex flex-col gap-1">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-gray-300 shrink-0">–</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
