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
        <Link href="/home"
          className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <span className="text-2xl">🏫</span>
          <div>
            <p className="font-bold text-gray-800">수업 현황</p>
            <p className="text-sm text-gray-400">단계 제어 및 실시간 현황</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
