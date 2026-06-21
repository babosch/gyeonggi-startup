import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TradeReportForm from './TradeReportForm'

export default async function TradeReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me || me.role !== 'officer') redirect('/home')

  // 이 반의 회사 목록
  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon')
    .eq('class_id', me.class_id).order('created_at')

  // 내가 제출한 보고서
  const { data: myReports } = await supabase
    .from('trade_reports')
    .select('id, item_name, detail, status, company_id, created_at')
    .eq('officer_id', user.id)
    .order('created_at', { ascending: false })

  return <TradeReportForm companies={companies ?? []} myReports={myReports ?? []} />
}
