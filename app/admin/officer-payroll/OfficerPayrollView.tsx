'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { WAGE } from '@/lib/constants'

interface Officer {
  id: string; number: number; nickname: string | null
  worklog: { text: string; created_at: string } | null
}

export default function OfficerPayrollView({
  officers, paidToday, stagePaidCountMap, stageMax,
}: {
  officers: Officer[]; paidToday: string[]
  stagePaidCountMap: Record<string, number>; stageMax: number | undefined
}) {
  const [paid, setPaid] = useState<string[]>(paidToday)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  function confirm(id: string) {
    setConfirmed(prev => { const n = new Set(prev); n.add(id); return n })
  }

  async function pay(officerId: string) {
    setBusy(officerId)
    const res = await fetch('/api/admin/officer-payroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: officerId }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setPaid(prev => [...prev, officerId])
    } else if (d.error === 'payroll_limit_reached') {
      alert(`이번 단계 급여 한도에 도달했어요. (${d.paid}/${d.max}일)`)
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  return (
    <PageShell title="공무원 급여 지급" emoji="🏛️">
      {officers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          임명된 공무원이 없어요.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700">
            💡 공무원이 업무일지를 작성한 것을 확인한 후 급여를 지급해요 · 하루에 한 번
            {stageMax !== undefined && (
              <span className="ml-2 font-bold">· 이번 단계 최대 {stageMax}일</span>
            )}
          </div>

          {officers.map(o => {
            const name = o.nickname ?? `${o.number}번`
            const done = paid.includes(o.id)
            const isConfirmed = confirmed.has(o.id) || done
            const stagePaid = stagePaidCountMap[o.id] ?? 0
            const limitReached = stageMax !== undefined && stagePaid >= stageMax

            return (
              <div key={o.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden border-2 transition-colors
                ${done ? 'border-green-200' : limitReached ? 'border-red-100' : isConfirmed ? 'border-blue-200' : 'border-gray-100'}`}>

                <div className={`flex items-center justify-between px-5 py-4
                  ${done ? 'bg-green-50' : limitReached ? 'bg-red-50' : isConfirmed ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏛️</span>
                    <div>
                      <div className="font-bold text-gray-800">공무원 {name}</div>
                      <div className="text-xs text-gray-400">{WAGE.officer.toLocaleString()}원</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stageMax !== undefined && (
                      <span className={`text-xs font-bold rounded-full px-2.5 py-1
                        ${limitReached ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {stagePaid}/{stageMax}일
                      </span>
                    )}
                    {done && !limitReached && <span className="text-green-600 font-bold text-sm">✓ 오늘 완료</span>}
                    {limitReached && <span className="text-red-500 font-bold text-sm">🚫 한도 도달</span>}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-500 mb-2">📝 최근 업무일지</div>
                  {o.worklog ? (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-sm text-gray-800 leading-relaxed">{o.worklog.text}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {new Date(o.worklog.created_at).toLocaleDateString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                      ⚠️ 아직 업무일지가 없어요
                    </div>
                  )}
                </div>

                {!done && !limitReached && (
                  <div className="px-5 pb-4">
                    {!isConfirmed ? (
                      <button onClick={() => confirm(o.id)}
                        className="w-full bg-gray-100 text-gray-700 rounded-2xl py-3 font-bold text-sm hover:bg-gray-200 transition-colors">
                        ✓ 업무일지 확인했어요
                      </button>
                    ) : (
                      <button onClick={() => pay(o.id)} disabled={busy === o.id}
                        className="w-full bg-blue-500 text-white rounded-2xl py-3 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform">
                        {busy === o.id ? '지급 중...' : `🏛️ ${WAGE.officer.toLocaleString()}원 지급하기`}
                      </button>
                    )}
                  </div>
                )}

                {limitReached && (
                  <div className="px-5 pb-4">
                    <div className="bg-red-50 border border-red-200 rounded-2xl py-3 text-center text-sm text-red-500 font-bold">
                      이번 단계 급여 한도({stageMax}일)에 도달했어요
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
