'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Req {
  id: string
  items: { name: string; qty: number; price: number }[]
  dropped_items: { name: string; reason: string }[]
  total: number
  status: string
  companies: { display_name: string } | { display_name: string }[]
}

export default function ReqReview({ reqs }: { reqs: Req[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, string>>(
    Object.fromEntries(reqs.map(r => [r.id, r.status]))
  )

  async function act(reqId: string, action: 'approve' | 'reject') {
    setBusy(reqId)
    const res = await fetch('/api/admin/approve-requisition', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reqId, action }),
    })
    setBusy(null)
    if (res.ok) setStates(s => ({ ...s, [reqId]: action === 'approve' ? 'approved' : 'rejected' }))
    else { const d = await res.json(); alert(d.error === '잔액이 부족합니다.' ? '회사 잔액 부족' : `오류: ${d.error}`) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-4">← 관리자 홈</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-5">🧾 품의서 결재</h1>

        {reqs.length === 0 && <div className="bg-white rounded-3xl p-10 text-center text-gray-400">품의서가 없어요.</div>}

        <div className="flex flex-col gap-4">
          {reqs.map(r => {
            const comp = Array.isArray(r.companies) ? r.companies[0] : r.companies
            const st = states[r.id]
            return (
              <div key={r.id} className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-800">{comp?.display_name}</span>
                  <span className="font-bold text-blue-600">{r.total.toLocaleString()}원</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {r.items.map((it, i) => (
                    <span key={i} className="inline-block bg-gray-100 rounded-lg px-2 py-1 mr-1 mb-1">
                      {it.name} {it.qty}개
                    </span>
                  ))}
                </div>
                {r.dropped_items?.length > 0 && (
                  <div className="text-xs text-amber-600 mb-3">
                    🤔 포기: {r.dropped_items.map(d => `${d.name}(${d.reason})`).join(', ')}
                  </div>
                )}
                {st === 'submitted' ? (
                  <div className="flex gap-2">
                    <button onClick={() => act(r.id, 'approve')} disabled={busy === r.id}
                      className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold disabled:opacity-40">승인</button>
                    <button onClick={() => act(r.id, 'reject')} disabled={busy === r.id}
                      className="px-6 py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium disabled:opacity-40">반려</button>
                  </div>
                ) : (
                  <span className={`text-sm font-medium ${st === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                    {st === 'approved' ? '✓ 승인됨' : '✕ 반려됨'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
