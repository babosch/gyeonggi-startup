import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/superadmin'
import SuperView from './SuperView'

export default async function SuperPage() {
  const { createClient } = await import('@/lib/supabase/server')
  const { ok } = await isSuperAdmin()
  let canAccess = ok
  if (!canAccess) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
      if (me?.role === 'mayor' && me.class_id) {
        const { data: cls } = await supabase.from('classes').select('code').eq('id', me.class_id).single()
        canAccess = cls?.code === '3643410'
      }
    }
  }
  if (!canAccess) redirect('/admin')

  const admin = createAdminClient()

  const CLASS_ORDER = ['수원시', '이천시', '고양시', '부천시', '파주시', '시흥시']

  // 반별 시장 현황
  const { data: classes } = await admin.from('classes').select('id, name, color')
  const { data: mayors } = await admin.from('users').select('id, class_id').eq('role', 'mayor')

  // 교사 auth 계정 매핑 (이메일)
  const { data: authList } = await admin.auth.admin.listUsers()
  const emailById = new Map((authList?.users ?? []).map(u => [u.id, u.email ?? '']))

  const classRows = (classes ?? [])
    .sort((a, b) => {
      const ai = CLASS_ORDER.indexOf(a.name)
      const bi = CLASS_ORDER.indexOf(b.name)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
    .map(c => {
      const mayor = (mayors ?? []).find(m => m.class_id === c.id)
      return {
        id: c.id, name: c.name, color: c.color,
        mayorId: mayor?.id ?? null,
        mayorEmail: mayor ? (emailById.get(mayor.id) ?? '(이메일 없음)') : null,
      }
    })

  // 떠도는 교사 계정 (비-classroom, users 행에 없거나 미배정)
  const { data: allUsers } = await admin.from('users').select('id')
  const registeredIds = new Set((allUsers ?? []).map(u => u.id))
  const orphanAccounts = (authList?.users ?? [])
    .filter(u => u.email && !u.email.includes('classroom.local'))
    .map(u => ({ id: u.id, email: u.email ?? '', registered: registeredIds.has(u.id) }))

  return <SuperView classRows={classRows} orphanAccounts={orphanAccounts} />
}
