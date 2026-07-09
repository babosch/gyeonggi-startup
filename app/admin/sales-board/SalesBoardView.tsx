'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CompanyRev {
  id: string
  name: string
  icon: string
  acctId: string | null
  revenue: number
}

const BAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-orange-500',
]
const MEDAL = ['🥇', '🥈', '🥉']

export default function SalesBoardView({ cityName, classId, initialCompanies }: {
  cityName: string
  classId: string
  initialCompanies: CompanyRev[]
}) {
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanyRev[]>(initialCompanies)
  const [live, setLive] = useState(false)
  const [flash, setFlash] = useState(false)
  const acctIds = useRef(initialCompanies.map(c => c.acctId).filter(Boolean) as string[])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 최신 순 판매액 다시 계산 (transactions는 RLS USING(true) → 클라이언트에서 조회 가능)
  // 순 판매액 = 구매(purchase) 합계 - 판매 취소 환불(refund, 회사가 되돌려준 것)
  const refetch = useCallback(async () => {
    const supabase = createClient()
    if (acctIds.current.length === 0) return
    const rev: Record<string, number> = {}
    const { data: sales } = await supabase
      .from('transactions').select('to_account_id, amount')
      .in('to_account_id', acctIds.current)
      .eq('type', 'purchase').eq('voided', false)
    for (const t of sales ?? []) {
      rev[t.to_account_id as string] = (rev[t.to_account_id as string] ?? 0) + ((t.amount as number) ?? 0)
    }
    const { data: refunds } = await supabase
      .from('transactions').select('from_account_id, amount')
      .in('from_account_id', acctIds.current)
      .eq('type', 'refund').eq('voided', false)
    for (const t of refunds ?? []) {
      rev[t.from_account_id as string] = (rev[t.from_account_id as string] ?? 0) - ((t.amount as number) ?? 0)
    }
    setCompanies(prev => prev.map(c => ({
      ...c,
      revenue: c.acctId ? (rev[c.acctId] ?? 0) : 0,
    })))
    setFlash(true)
    setTimeout(() => setFlash(false), 700)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    // companies.balance 는 판매 때마다 syncCompanyBalance로 갱신되고 realtime publication에 포함됨
    // → 이걸 "무언가 바뀌었다" 신호로 삼아 판매액을 다시 계산한다.
    const ch = supabase.channel(`sales-board:${classId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'companies',
        filter: `class_id=eq.${classId}`,
      }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(refetch, 300)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setLive(true)
      })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(ch)
    }
  }, [classId, refetch])

  const sorted = [...companies].sort((a, b) => b.revenue - a.revenue)
  const maxRev = Math.max(1, ...sorted.map(c => c.revenue))
  const totalRev = companies.reduce((s, c) => s + c.revenue, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-5 hover:text-red-600 active:scale-95 transition-all">
          <span className="text-2xl leading-none font-black">←</span>
          <span>이전으로</span>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📊</span> 회사별 판매액 현황
          </h1>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${live ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {live ? '● 실시간' : '연결 중…'}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-5">{cityName} · 판매가 일어나면 자동으로 갱신돼요</p>

        {/* 총 판매액 */}
        <div className={`bg-white rounded-3xl p-5 shadow-sm mb-4 flex items-center justify-between transition-colors ${flash ? 'bg-green-50' : ''}`}>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">우리 반 총 판매액</div>
            <div className="text-3xl font-bold text-blue-600">{totalRev.toLocaleString()}원</div>
          </div>
          <button onClick={refetch}
            className="text-sm text-gray-400 border border-gray-200 rounded-xl px-3 py-2 active:scale-95">
            🔄 새로고침
          </button>
        </div>

        {/* 세로 막대 그래프 (각 막대 위에 금액 표시) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm">
          {sorted.length === 0 ? (
            <p className="text-gray-400 text-center py-8">아직 회사가 없어요.</p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="flex items-end justify-around gap-2 sm:gap-4 min-w-fit"
                style={{ height: 260 }}
              >
                {sorted.map((c, i) => {
                  // 막대 높이: 최대값 기준. 라벨 공간을 위해 최대 85%까지만 채움.
                  const barPct = c.revenue > 0 ? Math.max(6, (c.revenue / maxRev) * 85) : 0
                  return (
                    <div key={c.id} className="flex-1 min-w-[56px] max-w-[110px] h-full flex flex-col items-center justify-end">
                      {/* 금액 (막대 위) */}
                      <div className="text-sm sm:text-base font-bold text-gray-800 mb-1 whitespace-nowrap">
                        {c.revenue.toLocaleString()}원
                      </div>
                      {/* 막대 */}
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]} ${c.revenue === 0 ? 'opacity-30' : ''}`}
                        style={{ height: `${barPct}%`, minHeight: c.revenue > 0 ? 8 : 3 }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* 회사 이름 (막대 아래) */}
              <div className="flex items-start justify-around gap-2 sm:gap-4 min-w-fit mt-2 border-t border-gray-100 pt-2">
                {sorted.map((c, i) => (
                  <div key={c.id} className="flex-1 min-w-[56px] max-w-[110px] flex flex-col items-center text-center gap-0.5">
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-xs font-bold text-gray-700 leading-tight break-keep">{c.name}</span>
                    <span className="text-xs">{MEDAL[i] ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
