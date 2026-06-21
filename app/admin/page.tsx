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

          {superAdmin && (
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
      </div>
    </div>
  )
}
