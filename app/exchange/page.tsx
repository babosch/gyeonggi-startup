import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import ExchangeView from './ExchangeView'
import type { Stage } from '@/lib/types'

export default async function ExchangePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('exchange')) return <ActivityLocked activityKey="exchange" />

  const { data: me } = await supabase
    .from('users').select('role, company_id, class_id, classes(stage, fair_mode)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage; fair_mode: boolean }

  // 같은 반 회사들 (자기 회사 제외)
  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon').eq('class_id', me.class_id)
  const others = (companies ?? []).filter(c => c.id !== me.company_id)

  // 기존 교류 기록
  const { data: exchanges } = await supabase
    .from('exchanges').select('give, want, thanks, from_company, to_company, created_at')
    .eq('class_id', me.class_id).order('created_at', { ascending: false }).limit(10)

  return (
    <ExchangeView
      stage={cls.stage} fairMode={cls.fair_mode} role={me.role}
      hasCompany={!!me.company_id} others={others} exchanges={exchanges ?? []}
    />
  )
}
