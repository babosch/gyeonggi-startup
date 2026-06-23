import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NoticesView from './NoticesView'

export default async function AdminNoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (me?.role !== 'mayor') redirect('/admin')

  // 모든 반 교사가 공유하는 글 — admin 클라이언트로 전체 조회
  const admin = createAdminClient()
  const { data: notices } = await admin
    .from('shared_notices')
    .select('id, author_id, author_city, title, body, visible_to_students, created_at')
    .order('created_at', { ascending: false })

  return <NoticesView notices={notices ?? []} myId={user.id} />
}
