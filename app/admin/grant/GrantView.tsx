'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Company { id: string; display_name: string; icon: string | null; balance: number }

const PRESETS = [10_000, 30_000, 50_000, 100_000]

export default function GrantView({ companies: initial }: { companies: Company[] }) {
  const [companies, setCompanies] = useState<Company[]>(initial)
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, number>>({})

  async function grant(c: Company) {
    const amount = amounts[c.id] ?? 0
    if (!Number.isInteger(amount) || amount <= 0) return
    setBusy(c.id)
    // 같은 클릭 재시도는 1회만 처리되도록 nonce 생성
    const nonce = crypto.randomUUID()
    const res = await fetch('/api/admin/grant-extra', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: c.id, amount, nonce }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      if (typeof d.balance === 'number') {
        setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, balance: d.balance } : x))
      }
      setDone(prev => ({ ...prev, [c.id]: amount }))
      setAmounts(prev => ({ ...prev, [c.id]: 0 }))
    } else {
      alert(d.error === 'invalid_amount' ? '금액을 확인해 주세요 (1~1,000,000원).' : `오류: ${d.error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/home" className="text-gray-400 text-sm mb-4 inline-block">← 교사 홈</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">💰 지원금 추가 지급</h1>
        <p className="text-sm text-gray-400 mb-5">회사에 지원금을 추가로 지급해요. 금액이 회사 잔액에 바로 더해져요.</p>

        {companies.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 선정된 회사가 없어요.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {companies.map(c => {
              const amount = amounts[c.id] ?? 0
              return (
                <div key={c.id} className="bg-white rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-800 text-lg">{c.icon ?? '🏢'} {c.display_name}</div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">현재 잔액</div>
                      <div className="font-bold text-blue-700">{c.balance.toLocaleString()}원</div>
                    </div>
                  </div>

                  {done[c.id] && (
                    <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700 font-medium">
                      ✅ {done[c.id].toLocaleString()}원 지급 완료
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESETS.map(p => (
                      <button key={p} onClick={() => setAmounts(prev => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + p }))}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        +{p.toLocaleString()}
                      </button>
                    ))}
                    <button onClick={() => setAmounts(prev => ({ ...prev, [c.id]: 0 }))}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-500">
                      초기화
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input type="number" min={0} value={amount || ''} onChange={e => setAmounts(prev => ({ ...prev, [c.id]: Math.max(0, +e.target.value) }))}
                      placeholder="지급 금액"
                      className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-center font-bold focus:border-blue-400 outline-none" />
                    <button onClick={() => grant(c)} disabled={busy === c.id || amount <= 0}
                      className="bg-blue-500 text-white rounded-xl px-5 py-2.5 font-bold disabled:opacity-40 active:scale-95 transition-transform">
                      {busy === c.id ? '...' : `${amount > 0 ? amount.toLocaleString() + '원 ' : ''}지급`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
