import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TradeReportsAdmin from './TradeReportsAdmin'

export default async function TradeReportsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/admin')

  const { data: reports } = await supabase
    .from('trade_reports')
    .select(`
      id, item_name, detail, status, mayor_note, created_at,
      companies(display_name, icon),
      users!officer_id(number, nickname)
    `)
    .eq('class_id', me.class_id)
    .order('created_at', { ascending: false })

  return <TradeReportsAdmin reports={(reports ?? []).map(r => ({
    id: r.id, itemName: r.item_name, detail: r.detail,
    status: r.status, mayorNote: r.mayor_note ?? '',
    createdAt: r.created_at,
    company: Array.isArray(r.companies) ? r.companies[0] : r.companies,
    officer: Array.isArray(r.users) ? r.users[0] : r.users,
  }))} />
}
