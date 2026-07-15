'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CompanyRev {
  id: string
  name: string
  icon: string
  acctId: string | null
  revenue: number   // 순 판매액(매출) = 구매 − 판매환불
  grant: number     // 받은 지원금
  material: number  // 지출 = 재료비(승인 품의서) + 시설이용비(승인 시설사용) 합계
  profit: number    // 실제 이익 = 매출 − 지출
}

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

  // 판매가 바뀌면 매출·이익만 다시 계산 (재료비·지원금은 성찰 단계엔 고정)
  const refetch = useCallback(async () => {
    const supabase = createClient()
    if (acctIds.current.length === 0) return
    const rev: Record<string, number> = {}
    const { data: sales } = await supabase
      .from('transactions').select('to_account_id, amount')
      .in('to_account_id', acctIds.current).eq('type', 'purchase').eq('voided', false)
    for (const t of sales ?? []) rev[t.to_account_id as string] = (rev[t.to_account_id as string] ?? 0) + ((t.amount as number) ?? 0)
    const { data: refunds } = await supabase
      .from('transactions').select('from_account_id, amount')
      .in('from_account_id', acctIds.current).eq('type', 'refund').eq('voided', false)
    for (const t of refunds ?? []) rev[t.from_account_id as string] = (rev[t.from_account_id as string] ?? 0) - ((t.amount as number) ?? 0)
    setCompanies(prev => prev.map(c => {
      const revenue = c.acctId ? (rev[c.acctId] ?? 0) : 0
      return { ...c, revenue, profit: revenue - c.material }
    }))
    setFlash(true)
    setTimeout(() => setFlash(false), 700)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`sales-board:${classId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies', filter: `class_id=eq.${classId}` }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(refetch, 300)
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') setLive(true) })
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); supabase.removeChannel(ch) }
  }, [classId, refetch])

  const sorted = [...companies].sort((a, b) => b.profit - a.profit)
  // 세 지표(매출·재료비·이익)를 같은 축으로 비교하기 위한 최대값
  const maxVal = Math.max(1, ...companies.flatMap(c => [c.revenue, c.material, c.profit]))
  const totalRev = companies.reduce((s, c) => s + c.revenue, 0)
  const totalProfit = companies.reduce((s, c) => s + c.profit, 0)

  const h = (v: number) => (v > 0 ? Math.max(4, (v / maxVal) * 88) : 0)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/home')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-5 active:scale-95 transition-all">
          <span className="text-2xl leading-none font-black">←</span><span>이전으로</span>
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><span>📊</span> 회사별 이익 현황</h1>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${live ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {live ? '● 실시간' : '연결 중…'}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-4">{cityName} · 매출·지출(재료비+시설이용비)·실제 이익을 한눈에 비교해요</p>

        {/* 요약 */}
        <div className={`bg-white rounded-3xl p-5 shadow-sm mb-4 flex items-center justify-between flex-wrap gap-3 transition-colors ${flash ? 'bg-green-50' : ''}`}>
          <div className="flex gap-6">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">우리 반 총 매출</div>
              <div className="text-2xl font-bold text-blue-600">{totalRev.toLocaleString()}원</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">우리 반 총 이익</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{totalProfit.toLocaleString()}원</div>
            </div>
          </div>
          <button onClick={refetch} className="text-sm text-gray-400 border border-gray-200 rounded-xl px-3 py-2 active:scale-95">🔄 새로고침</button>
        </div>

        {/* 범례 */}
        <div className="flex gap-4 mb-2 px-1 text-xs font-bold">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> 매출</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 지출 (재료비+시설이용비)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> 실제 이익 (매출−지출)</span>
          <span className="text-gray-400 font-medium">· 지원금은 뱃지로 표시</span>
        </div>

        {/* 회사별 그룹 막대 */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm">
          {sorted.length === 0 ? (
            <p className="text-gray-400 text-center py-8">아직 회사가 없어요.</p>
          ) : (
            <div className="overflow-x-auto">
              {/* 이익 라벨 + 막대 그룹 */}
              <div className="flex items-end justify-around gap-3 sm:gap-5 min-w-fit" style={{ height: 240 }}>
                {sorted.map(c => (
                  <div key={c.id} className="flex-1 min-w-[84px] max-w-[140px] h-full flex flex-col items-center justify-end">
                    <div className={`text-sm font-bold mb-1 whitespace-nowrap ${c.profit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                      이익 {c.profit.toLocaleString()}원
                    </div>
                    <div className="w-full flex items-end justify-center gap-1" style={{ height: '100%' }}>
                      <Bar color="bg-blue-500" pct={h(c.revenue)} title={`매출 ${c.revenue.toLocaleString()}원`} />
                      <Bar color="bg-amber-500" pct={h(c.material)} title={`지출(재료비+시설이용비) ${c.material.toLocaleString()}원`} />
                      <Bar color={c.profit >= 0 ? 'bg-purple-500' : 'bg-red-400'} pct={h(c.profit)} title={`이익 ${c.profit.toLocaleString()}원`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 회사명 + 숫자 */}
              <div className="flex items-start justify-around gap-3 sm:gap-5 min-w-fit mt-2 border-t border-gray-100 pt-2">
                {sorted.map((c, i) => (
                  <div key={c.id} className="flex-1 min-w-[84px] max-w-[140px] flex flex-col items-center text-center gap-0.5">
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-xs font-bold text-gray-700 leading-tight break-keep">{c.name} {MEDAL[i] ?? ''}</span>
                    <span className="text-[11px] text-green-700 bg-green-50 rounded-full px-2 py-0.5 mt-0.5">지원금 {c.grant.toLocaleString()}원</span>
                    <div className="text-[11px] text-gray-500 leading-snug mt-0.5">
                      매출 {c.revenue.toLocaleString()}<br />지출 {c.material.toLocaleString()}
                    </div>
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

function Bar({ color, pct, title }: { color: string; pct: number; title: string }) {
  return (
    <div className="flex-1 max-w-[28px] h-full flex items-end" title={title}>
      <div className={`w-full rounded-t-lg transition-all duration-500 ${color} ${pct === 0 ? 'opacity-25' : ''}`}
        style={{ height: `${pct}%`, minHeight: 3 }} />
    </div>
  )
}
