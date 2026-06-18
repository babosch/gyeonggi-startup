'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { WAGE } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface Member { id: string; number: number; nickname: string | null; role: string }

export default function PayrollList({ stage, members, balance, paidToday, notCeo }: {
  stage: Stage; members: Member[]; balance: number; paidToday: string[]; notCeo?: boolean
}) {
  const [paid, setPaid] = useState<string[]>(paidToday)
  const [bal, setBal] = useState(balance)
  const [busy, setBusy] = useState<string | null>(null)

  if (notCeo) return (
    <PageShell title="급여 지급" emoji="💵">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 급여를 줄 수 있어요.</div>
    </PageShell>
  )
  if (stage < 2) return <PageShell title="급여 지급" emoji="💵" locked={{ opensAt: '생산' }}>{null}</PageShell>

  async function pay(m: Member) {
    setBusy(m.id)
    const res = await fetch('/api/payroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: m.id }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) { setPaid([...paid, m.id]); setBal(b => b - d.wage) }
    else alert(d.error === '잔액이 부족합니다.' ? '회사 잔액이 부족해요' : `오류: ${d.error}`)
  }

  return (
    <PageShell title="급여 지급" emoji="💵">
      <div className="bg-blue-50 rounded-2xl p-4 text-center mb-4">
        <span className="text-sm text-blue-600">회사 잔액</span>
        <div className="text-2xl font-bold text-blue-700">{bal.toLocaleString()}원</div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="font-bold text-gray-800 mb-1">오늘 급여 주기</div>
        <p className="text-xs text-gray-400 mb-4">하루에 한 번만 줄 수 있어요</p>
        <div className="flex flex-col gap-2">
          {members.map(m => {
            const wage = m.role === 'ceo' ? WAGE.ceo : WAGE.staff
            const done = paid.includes(m.id)
            return (
              <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div>
                  <span className="font-medium text-gray-800">
                    {m.role === 'ceo' ? '👑' : '🛠️'} {m.nickname ?? `${m.number}번`}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">{wage.toLocaleString()}원</span>
                </div>
                <button onClick={() => pay(m)} disabled={done || busy === m.id || bal < wage}
                  className={`px-5 py-2 rounded-xl font-bold text-sm transition-all
                    ${done ? 'bg-green-100 text-green-600' : 'bg-blue-500 text-white disabled:opacity-40'}`}>
                  {done ? '✓ 지급함' : busy === m.id ? '...' : '지급'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
