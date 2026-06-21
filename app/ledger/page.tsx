import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import LedgerView from './LedgerView'
import type { Stage } from '@/lib/types'

const TYPE_LABEL: Record<string, string> = {
  grant: '지원금', purchase: '구입', payroll: '급여',
  facility: '시설료', exchange: '교류', refund: '환불', adjust: '보정',
}

export interface TxRow {
  type: string; amount: number; memo: string | null; created_at: string; direction: 'in' | 'out'
}
export interface CompanyData {
  id: string; display_name: string; icon: string
  ceo: { name: string } | null
  worklogs: { text: string; created_at: string }[]
  transactions: TxRow[]
}

export default async function LedgerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('ledger')) return <ActivityLocked activityKey="ledger" />

  const { data: me } = await supabase
    .from('users').select('role, class_id, classes(stage)').eq('id', user.id).single()
  if (!me) redirect('/home')
  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { stage: Stage }

  if (me.role !== 'officer' && me.role !== 'mayor') {
    return <LedgerView stage={cls.stage} notAllowed companies={[]} />
  }

  // 1. 반 소속 회사 목록
  const { data: companies } = await supabase
    .from('companies').select('id, display_name, icon').eq('class_id', me.class_id!)
  const companyIds = (companies ?? []).map(c => c.id)

  // 2. 회사 소속 직원 (CEO 식별용)
  const { data: members } = companyIds.length > 0
    ? await supabase.from('users')
        .select('id, number, nickname, role, company_id')
        .in('company_id', companyIds)
    : { data: [] }

  // 3. 회사 계좌 (owner_type='company')
  const { data: companyAccts } = companyIds.length > 0
    ? await supabase.from('accounts')
        .select('id, owner_id')
        .eq('owner_type', 'company')
        .in('owner_id', companyIds)
    : { data: [] }

  const acctToCompany: Record<string, string> = {}
  for (const a of companyAccts ?? []) acctToCompany[a.id] = a.owner_id

  // 4. 거래 내역 (회사 계좌 관련)
  const acctIds = (companyAccts ?? []).map(a => a.id)
  const { data: txs } = acctIds.length > 0
    ? await supabase.from('transactions')
        .select('amount, type, memo, created_at, from_account_id, to_account_id')
        .or(`from_account_id.in.(${acctIds.join(',')}),to_account_id.in.(${acctIds.join(',')})`)
        .order('created_at', { ascending: false }).limit(300)
    : { data: [] }

  // 회사별 거래 분류
  type TxRaw = { amount: number; type: string; memo: string | null; created_at: string; from_account_id: string; to_account_id: string }
  const txsByCompany: Record<string, TxRaw[]> = {}
  for (const tx of txs ?? []) {
    const cid = acctToCompany[tx.from_account_id] || acctToCompany[tx.to_account_id]
    if (!cid) continue
    if (!txsByCompany[cid]) txsByCompany[cid] = []
    txsByCompany[cid].push(tx as TxRaw)
  }

  // 5. CEO 업무일지
  const ceoMap: Record<string, { id: string; name: string }> = {}
  for (const m of members ?? []) {
    if (m.role === 'ceo' && m.company_id) {
      ceoMap[m.company_id] = { id: m.id, name: m.nickname ?? `${m.number}번` }
    }
  }
  const ceoIds = Object.values(ceoMap).map(c => c.id)
  const { data: worklogs } = ceoIds.length > 0
    ? await supabase.from('activity_logs')
        .select('user_id, payload, created_at')
        .in('user_id', ceoIds).eq('action', 'worklog')
        .order('created_at', { ascending: false }).limit(ceoIds.length * 5)
    : { data: [] }

  const worklogsByUser: Record<string, { text: string; created_at: string }[]> = {}
  for (const wl of worklogs ?? []) {
    if (!worklogsByUser[wl.user_id]) worklogsByUser[wl.user_id] = []
    if (worklogsByUser[wl.user_id].length < 3) {
      worklogsByUser[wl.user_id].push({ text: wl.payload?.text ?? '', created_at: wl.created_at })
    }
  }

  // 6. 회사별 데이터 조합
  const companyDataList: CompanyData[] = (companies ?? []).map(co => {
    const ceo = ceoMap[co.id] ?? null
    const coAcctId = (companyAccts ?? []).find(a => a.owner_id === co.id)?.id
    return {
      id: co.id,
      display_name: co.display_name,
      icon: co.icon,
      ceo: ceo ? { name: ceo.name } : null,
      worklogs: ceo ? (worklogsByUser[ceo.id] ?? []) : [],
      transactions: (txsByCompany[co.id] ?? []).map(tx => ({
        type: TYPE_LABEL[tx.type] ?? tx.type,
        amount: tx.amount,
        memo: tx.memo,
        created_at: tx.created_at,
        direction: (tx.from_account_id === coAcctId ? 'out' : 'in') as 'in' | 'out',
      })),
    }
  })

  return <LedgerView stage={cls.stage} companies={companyDataList} />
}
