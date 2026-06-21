import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
    .from('users')
    .select('role, company_id, class_id, classes(id, name, stage, fair_mode)')
    .eq('id', user.id).single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as {
    id: string; name: string; stage: Stage; fair_mode: boolean
  }

  // 우리 반 회사 목록
  const { data: ownCompanies } = await supabase
    .from('companies').select('id, display_name, icon').eq('class_id', me.class_id!)

  // 우리 반 교류 카드 (CEO가 등록한 것)
  const { data: ownCards } = await supabase
    .from('exchange_cards').select('company_id, offer, want, updated_at')
    .eq('class_id', me.class_id!)

  // 내 교류 카드 (CEO용)
  const myCard = (ownCards ?? []).find(c => c.company_id === me.company_id) ?? null

  // 우리 반 교류 성사 일지
  const { data: exchangeLogs } = await supabase
    .from('exchange_logs')
    .select('id, from_company_id, to_city_name, to_company_name, give_text, received_text, notes, created_at')
    .eq('class_id', me.class_id!)
    .order('created_at', { ascending: false })

  // 박람회 ON + 공무원/시장: 다른 반 카드 조회 (어드민으로 RLS 우회)
  let crossCards: Array<{
    company_id: string; company_name: string; icon: string;
    city_name: string; class_id: string; offer: string; want: string;
  }> = []

  if (cls.fair_mode && (me.role === 'officer' || me.role === 'mayor')) {
    const admin = createAdminClient()
    const { data: allCards } = await admin
      .from('exchange_cards')
      .select('company_id, offer, want, class_id, companies(display_name, icon), classes(name)')
      .neq('class_id', me.class_id!)

    for (const c of allCards ?? []) {
      const co = Array.isArray(c.companies) ? c.companies[0] : c.companies
      const cl = Array.isArray(c.classes) ? c.classes[0] : c.classes
      if (!co || !cl) continue
      crossCards.push({
        company_id: c.company_id,
        company_name: (co as any).display_name,
        icon: (co as any).icon,
        city_name: (cl as any).name,
        class_id: c.class_id,
        offer: c.offer,
        want: c.want,
      })
    }
  }

  return (
    <ExchangeView
      stage={cls.stage}
      fairMode={cls.fair_mode}
      role={me.role}
      myCompanyId={me.company_id ?? null}
      myCityName={cls.name}
      classId={me.class_id!}
      ownCompanies={ownCompanies ?? []}
      ownCards={ownCards ?? []}
      crossCards={crossCards}
      exchangeLogs={exchangeLogs ?? []}
      myCard={myCard}
    />
  )
}
