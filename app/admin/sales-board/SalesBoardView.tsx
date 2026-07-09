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

  // 최신 판매액 다시 계산 (transactions는 RLS USING(true) → 클라이언트에서 조회 가능)
  const refetch = useCallback(async () => {
    const supabase = createClient()
    if (acctIds.current.length === 0) return
    const { data } = await supabase
      .from('transactions').select('to_account_id, amount')
      .in('to_account_id', acctIds.current)
      .eq('type', 'purchase').eq('voided', false)
    const rev: Record<string, number> = {}
    for (const t of data ?? []) {
      rev[t.to_account_id as string] = (rev[t.to_account_id as string] ?? 0) + ((t.amount as number) ?? 0)
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

        {/* 막대 그래프 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          {sorted.length === 0 ? (
            <p className="text-gray-400 text-center py-8">아직 회사가 없어요.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sorted.map((c, i) => {
                const pct = Math.round((c.revenue / maxRev) * 100)
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{MEDAL[i] ?? `${i + 1}.`}</span>
                        <span className="text-xl shrink-0">{c.icon}</span>
                        <span className="font-bold text-gray-800 truncate">{c.name}</span>
                      </div>
                      <span className="font-bold text-gray-700 shrink-0 ml-2">{c.revenue.toLocaleString()}원</span>
                    </div>
                    <div className="h-7 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: `${c.revenue > 0 ? Math.max(pct, 4) : 0}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
