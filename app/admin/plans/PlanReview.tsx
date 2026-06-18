'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_COMPANIES_PER_CLASS } from '@/lib/constants'

interface Plan {
  id: string
  user_id: string
  content: {
    companyName?: string; whatToSell?: string; target?: string
    useSpecialty?: boolean; specialtyDetail?: string; reason?: string
    items?: { name: string; qty: number; price: number }[]
  }
  reserve_amount: number
  status: string
  users: { number: number; nickname: string | null } | { number: number; nickname: string | null }[]
}

export default function PlanReview({ plans, selectedCount }: { plans: Plan[]; selectedCount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [count, setCount] = useState(selectedCount)

  async function act(planId: string, action: 'select' | 'cancel', grantBonus: boolean) {
    setBusy(planId)
    const res = await fetch('/api/admin/select-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, action, grantBonus }),
    })
    const data = await res.json()
    setBusy(null)
    if (res.ok) {
      setCount(c => action === 'select' ? c + 1 : c - 1)
      router.refresh()
    } else {
      alert(data.error === 'company_limit' ? '이미 4개 회사가 선정됐어요.' : `오류: ${data.error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-4">← 관리자 홈</button>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-gray-800">📝 사업계획서 심사</h1>
          <span className="text-sm font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
            선정 {count}/{MAX_COMPANIES_PER_CLASS}
          </span>
        </div>

        {plans.length === 0 && (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
            아직 제출된 계획서가 없어요.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {plans.map(p => {
            const u = Array.isArray(p.users) ? p.users[0] : p.users
            const c = p.content
            const isSelected = p.status === 'selected'
            const itemTotal = (c.items ?? []).reduce((s, it) => s + it.qty * it.price, 0)
            return (
              <div key={p.id} className={`bg-white rounded-3xl p-6 shadow-sm border-2
                ${isSelected ? 'border-green-300' : 'border-transparent'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800">{c.companyName ?? '(이름 없음)'}</span>
                    {c.useSpecialty && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ 특산품</span>}
                    {isSelected && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">선정됨</span>}
                  </div>
                  <span className="text-sm text-gray-400">{u?.nickname ?? `${u?.number}번`}</span>
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>🎨 <b>무엇:</b> {c.whatToSell}</p>
                  <p>🙋 <b>대상:</b> {c.target}</p>
                  {c.useSpecialty && c.specialtyDetail && <p>⭐ <b>특산품 활용:</b> {c.specialtyDetail}</p>}
                  <p>💪 <b>이유:</b> {c.reason}</p>
                  <p>🧾 <b>구입 예정:</b> {itemTotal.toLocaleString()}원 · 예비비 {p.reserve_amount.toLocaleString()}원</p>
                </div>

                {isSelected ? (
                  <button onClick={() => act(p.id, 'cancel', false)} disabled={busy === p.id}
                    className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium disabled:opacity-50">
                    {busy === p.id ? '...' : '선정 취소'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => act(p.id, 'select', false)} disabled={busy === p.id || count >= MAX_COMPANIES_PER_CLASS}
                      className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold disabled:opacity-40">
                      선정
                    </button>
                    {c.useSpecialty && (
                      <button onClick={() => act(p.id, 'select', true)} disabled={busy === p.id || count >= MAX_COMPANIES_PER_CLASS}
                        className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-40">
                        선정 +보너스
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
