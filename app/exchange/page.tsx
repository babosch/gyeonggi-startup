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

  // 반 내 모든 회사 + 각 회사의 교류 카드
  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon').eq('class_id', me.class_id!)
  const companyIds = (companies ?? []).map(c => c.id)

  const { data: cards } = await supabase
    .from('exchange_cards').select('company_id, offer, want, updated_at')
    .eq('class_id', me.class_id!).order('updated_at', { ascending: false })

  // 교류 매칭 (성사된 것)
  const { data: matches } = await supabase
    .from('exchange_matches').select('id, company_a, company_b, created_at')
    .eq('class_id', me.class_id!).order('created_at', { ascending: false })

  // 회사별 교류 건수 (badge 계산)
  const matchCountMap: Record<string, number> = {}
  for (const m of matches ?? []) {
    matchCountMap[m.company_a] = (matchCountMap[m.company_a] ?? 0) + 1
    matchCountMap[m.company_b] = (matchCountMap[m.company_b] ?? 0) + 1
  }

  // 내 카드
  const myCard = (cards ?? []).find(c => c.company_id === me.company_id) ?? null

  return (
    <ExchangeView
      stage={cls.stage}
      fairMode={cls.fair_mode}
      role={me.role}
      myCompanyId={me.company_id ?? null}
      companies={companies ?? []}
      cards={cards ?? []}
      matches={matches ?? []}
      matchCountMap={matchCountMap}
      myCard={myCard}
    />
  )
}
