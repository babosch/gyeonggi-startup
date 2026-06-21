import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ExchangeMonitorView from './ExchangeMonitorView'

export default async function ExchangeMonitorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || me.role !== 'mayor') redirect('/home')

  const admin = createAdminClient()

  // 전체 반 목록
  const { data: classes } = await admin
    .from('classes').select('id, name').order('name')

  // 전체 회사 목록
  const { data: companies } = await admin
    .from('companies').select('id, display_name, icon, class_id')

  // 전체 교류 카드 (exchange_cards)
  const { data: allCards } = await admin
    .from('exchange_cards')
    .select('company_id, class_id, offer, want, updated_at')
    .order('updated_at', { ascending: false })

  // 전체 교류 성사 일지 (exchange_logs)
  const { data: allLogs } = await admin
    .from('exchange_logs')
    .select('id, class_id, from_company_id, to_city_name, to_company_name, give_text, received_text, notes, created_at')
    .order('created_at', { ascending: false })

  return (
    <ExchangeMonitorView
      myClassId={me.class_id!}
      classes={classes ?? []}
      companies={companies ?? []}
      cards={allCards ?? []}
      logs={allLogs ?? []}
    />
  )
}
