import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">📊 현황 보드</h1>
      <div className="bg-white rounded-3xl p-10 text-center text-gray-400">곧 만들어집니다.</div>
    </div>
  )
}
