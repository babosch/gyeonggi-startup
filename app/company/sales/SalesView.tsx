'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

interface Sale { id: string; amount: number; memo: string | null; created_at: string; buyer: string; refunded: boolean }

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function SalesView({ sales: initial }: { sales: Sale[] }) {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function refund(s: Sale) {
    if (!confirm(`${s.buyer}님에게 ${s.amount.toLocaleString()}원을 돌려줄까요?\n(물건도 돌려받았는지 확인하고, 재고는 회사 관리에서 다시 올려주세요)`)) return
    setBusy(s.id)
    const res = await fetch('/api/refund', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId: s.id }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) setSales(prev => prev.map(x => x.id === s.id ? { ...x, refunded: true } : x))
    else alert(d.error === 'insufficient' ? '회사 잔액이 부족해 환불할 수 없어요' : `오류: ${d.error}`)
  }

  return (
    <PageShell title="판매 취소·환불" emoji="↩️">
      <div className="flex flex-col gap-4">
        <button onClick={() => router.push('/company')} className="text-gray-400 text-sm text-left">← 회사 관리로</button>

        <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700">
          잘못 팔린 경우 환불할 수 있어요. 환불하면 손님에게 <b>금액이 돌아가요</b>. 재고는 회사 관리에서 다시 올려주세요.
        </div>

        {sales.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 판매 내역이 없어요.</div>
        ) : (
          <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-3">
            <div className="font-bold text-gray-800">판매 내역 (최신순)</div>
            {sales.map(s => (
              <div key={s.id} className={`border-2 rounded-2xl p-4 ${s.refunded ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-blue-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 text-sm">🙋 {s.buyer}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.memo ?? '구매'} · {fmt(s.created_at)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-blue-600">{s.amount.toLocaleString()}원</div>
                  </div>
                </div>
                <div className="mt-2">
                  {s.refunded ? (
                    <div className="text-center text-sm font-bold text-gray-400 py-1">↩️ 환불 완료</div>
                  ) : (
                    <button onClick={() => refund(s)} disabled={busy === s.id}
                      className="w-full border-2 border-red-200 text-red-500 rounded-xl py-2 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
                      {busy === s.id ? '...' : '↩️ 이 판매 취소·환불'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
