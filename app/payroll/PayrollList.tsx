'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { WAGE, MIN_STAFF_PER_COMPANY } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface Member { id: string; number: number; nickname: string | null; role: string }
interface WorklogEntry { text: string; created_at: string }

export default function PayrollList({ stage, members, balance, paidToday, notCeo, latestLogMap, maxStaff = 6 }: {
  stage: Stage; members: Member[]; balance: number; paidToday: string[]
  notCeo?: boolean; latestLogMap?: Record<string, WorklogEntry>; maxStaff?: number
}) {
  const [paid, setPaid] = useState<string[]>(paidToday)
  const [bal, setBal] = useState(balance)
  const [busy, setBusy] = useState<string | null>(null)

  if (notCeo) return (
    <PageShell title="급여 지급" emoji="💵">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 급여를 줄 수 있어요.</div>
    </PageShell>
  )

  const staffCount = members.filter(m => m.role !== 'ceo').length
  const needMore = staffCount < MIN_STAFF_PER_COMPANY

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

      {needMore && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 mb-4">
          ⚠️ 직원 {staffCount}명 / 최소 {MIN_STAFF_PER_COMPANY}명 필요 — 채용을 더 해야 해요
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="font-bold text-gray-800 mb-1">오늘 급여 주기</div>
        <p className="text-xs text-gray-400 mb-4">업무일지를 확인하고 지급해요 · 하루에 한 번만 줄 수 있어요</p>

        <div className="flex flex-col gap-3">
          {members.map(m => {
            const wage = m.role === 'ceo' ? WAGE.ceo : WAGE.staff
            const done = paid.includes(m.id)
            const log = latestLogMap?.[m.id]
            const name = m.nickname ?? `${m.number}번`

            return (
              <div key={m.id} className={`rounded-2xl border-2 transition-colors
                ${done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-800">
                      {m.role === 'ceo' ? '👑' : '🛠️'} {name}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">{wage.toLocaleString()}원</span>
                  </div>
                  <button onClick={() => pay(m)} disabled={done || busy === m.id || bal < wage}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition-all
                      ${done ? 'bg-green-100 text-green-600' : 'bg-blue-500 text-white disabled:opacity-40'}`}>
                    {done ? '✓ 지급함' : busy === m.id ? '...' : '지급'}
                  </button>
                </div>

                <div className="px-4 pb-3 border-t border-gray-100">
                  {log ? (
                    <>
                      <div className="flex items-start gap-2 mt-2">
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">📝 최근 일지</span>
                        <span className="text-sm text-gray-700 leading-snug">{log.text}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(log.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      ⚠️ 업무일지 없음 — 지급 전 확인해요
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
