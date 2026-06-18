import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STAGE_LABELS, type Stage, type Role } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users')
    .select('*, classes(*)')
    .eq('id', user.id)
    .single()

  if (!me) redirect('/admin/setup')

  const cls = me.classes as { name: string; stage: Stage; color: string }
  const role = me.role as Role

  const roleLabels: Record<Role, string> = {
    mayor: '시장 (선생님)',
    applicant: '지원자',
    ceo: 'CEO',
    staff: '직원',
    officer: '공무원',
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <p className="text-gray-500 text-sm">{cls.name}</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">
          {me.nickname ?? `${me.number}번`}
        </h1>
        <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          {roleLabels[role]}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-gray-500 text-sm mb-1">현재 단계</p>
        <p className="text-xl font-bold text-gray-800">{STAGE_LABELS[cls.stage]}</p>
      </div>

      <p className="text-center text-gray-400 text-sm mt-8">
        MVP — 각 역할별 기능은 순서대로 추가됩니다
      </p>
    </div>
  )
}
