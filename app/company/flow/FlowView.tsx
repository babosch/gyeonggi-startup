'use client'

import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

interface Tx {
  id: string
  amount: number
  type: string
  memo: string | null
  created_at: string
  from_account_id: string | null
  to_account_id: string | null
}

function txMeta(tx: Tx, acctId: string): { label: string; emoji: string; dir: 'in' | 'out' } {
  const isIn = tx.to_account_id === acctId
  switch (tx.type) {
    case 'grant':    return { label: '지원금 수령', emoji: '🏛️', dir: 'in' }
    case 'purchase': return isIn
      ? { label: '판매 매출',   emoji: '🛒', dir: 'in' }
      : { label: '재료비 지출', emoji: '📦', dir: 'out' }
    case 'payroll':  return { label: '급여 지급',   emoji: '💸', dir: 'out' }
    case 'facility': return isIn
      ? { label: '시설 수익',   emoji: '🏗️', dir: 'in' }
      : { label: '시설 이용비', emoji: '🏗️', dir: 'out' }
    case 'exchange': return isIn
      ? { label: '교류 수입',   emoji: '🤝', dir: 'in' }
      : { label: '교류 지출',   emoji: '🤝', dir: 'out' }
    case 'refund':   return { label: '환불',         emoji: '↩️', dir: isIn ? 'in' : 'out' }
    case 'adjust':   return { label: '잔액 조정',    emoji: '⚙️', dir: isIn ? 'in' : 'out' }
    default:         return { label: tx.type,          emoji: '💰', dir: isIn ? 'in' : 'out' }
  }
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

const TYPE_ORDER = ['grant', 'purchase', 'payroll', 'facility', 'exchange', 'refund', 'adjust']
const TYPE_LABEL: Record<string, string> = {
  grant: '지원금', purchase: '매출·재료비', payroll: '급여', facility: '시설',
  exchange: '교류', refund: '환불', adjust: '조정',
}

export default function FlowView({ company, transactions, companyAcctId }: {
  company: { id: string; display_name: string; icon: string; balance: number } | null
  transactions: Tx[]
  companyAcctId: string | null
}) {
  const router = useRouter()

  const totalIn = transactions
    .filter(t => t.to_account_id === companyAcctId)
    .reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions
    .filter(t => t.from_account_id === companyAcctId)
    .reduce((s, t) => s + t.amount, 0)

  // 유형별 요약
  const byType: Record<string, { in: number; out: number; count: number }> = {}
  for (const tx of transactions) {
    if (!companyAcctId) continue
    const isIn = tx.to_account_id === companyAcctId
    if (!byType[tx.type]) byType[tx.type] = { in: 0, out: 0, count: 0 }
    byType[tx.type][isIn ? 'in' : 'out'] += tx.amount
    byType[tx.type].count++
  }

  return (
    <PageShell title="자산 흐름" emoji="📈">
      <div className="flex flex-col gap-4">
        <button onClick={() => router.push('/company')} className="text-gray-400 text-sm text-left">
          ← 회사 관리로
        </button>

        {/* 회사 잔액 요약 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">
            {company?.icon} {company?.display_name}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">총 수입</div>
              <div className="font-bold text-green-600 text-sm">+{totalIn.toLocaleString()}원</div>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">총 지출</div>
              <div className="font-bold text-red-500 text-sm">-{totalOut.toLocaleString()}원</div>
            </div>
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">현재 잔액</div>
              <div className="font-bold text-blue-600 text-sm">{(company?.balance ?? 0).toLocaleString()}원</div>
            </div>
          </div>
        </div>

        {/* 유형별 요약 */}
        {Object.keys(byType).length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">📊 유형별 요약</div>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_ORDER.filter(t => byType[t]).map(t => {
                const b = byType[t]
                return (
                  <div key={t} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">{TYPE_LABEL[t] ?? t} ({b.count}건)</div>
                    <div className="flex gap-2 text-xs">
                      {b.in > 0 && <span className="text-green-600 font-medium">+{b.in.toLocaleString()}</span>}
                      {b.out > 0 && <span className="text-red-500 font-medium">-{b.out.toLocaleString()}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 거래 타임라인 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="font-bold text-gray-800 mb-4">🕐 거래 내역 (최신순)</div>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">아직 거래가 없어요.</p>
          ) : (
            <div className="relative">
              {/* 타임라인 세로선 */}
              <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gray-100" />
              <div className="flex flex-col gap-0">
                {transactions.map((tx, i) => {
                  if (!companyAcctId) return null
                  const { label, emoji, dir } = txMeta(tx, companyAcctId)
                  return (
                    <div key={tx.id} className={`flex items-start gap-4 py-3
                      ${i < transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      {/* 타임라인 도트 */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 relative z-10
                        ${dir === 'in' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-gray-800">{label}</span>
                          <span className={`font-bold text-base shrink-0 ${dir === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                            {dir === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                          {tx.memo && <span className="truncate">{tx.memo}</span>}
                          <span className="shrink-0">{fmtDate(tx.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
