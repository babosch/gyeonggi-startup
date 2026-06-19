import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSubmissions } from '@/lib/submissions'
import SubmissionsView from '@/components/SubmissionsView'

export default async function SubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  const { plans, research, reflections } = await getSubmissions(supabase, me.class_id)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <SubmissionsView plans={plans as any} research={research as any} reflections={reflections as any} heading />
      </div>
    </div>
  )
}
