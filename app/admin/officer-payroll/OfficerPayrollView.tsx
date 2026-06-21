'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { WAGE } from '@/lib/constants'

interface Officer {
  id: string; number: number; nickname: string | null
  worklog: { text: string; created_at: string } | null
}

export default function OfficerPayrollView({
  officers, paidToday, totalPaidMap, todayPaidMap, totalMax = 6, dailyMax = 2,
}: {
  officers: Officer[]
  paidToday: string[]
  totalPaidMap: Record<string, number>
  todayPaidMap: Record<string, number>
  totalMax?: number
  dailyMax?: number
}) {
  const [todayPaid, setTodayPaid] = useState<Record<string, number>>(todayPaidMap)
  const [totalPaid, setTotalPaid] = useState<Record<string, number>>(totalPaidMap)
  const [busy, setBusy] = useState<string | null>(null)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})

  async function pay(officerId: string) {
    setBusy(officerId)
    const res = await fetch('/api/admin/officer-payroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: officerId }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setTodayPaid(prev => ({ ...prev, [officerId]: (prev[officerId] ?? 0) + 1 }))
      setTotalPaid(prev => ({ ...prev, [officerId]: (prev[officerId] ?? 0) + 1 }))
    } else if (d.error === 'cooldown') {
      setCooldowns(prev => ({ ...prev, [officerId]: d.remainingMinutes }))
      alert(`아직 ${d.remainingMinutes}분 더 기다려야 해요. (지급 간격 30분)`)
    } else if (d.error === 'no_worklog_today') {
      alert('오늘 업무일지를 먼저 써야 급여를 받을 수 있어요.')
    } else if (d.error === 'total_limit_reached') {
      alert(`전체 급여 한도(${totalMax}회)에 도달했어요.`)
    } else if (d.error === 'daily_limit_reached') {
      alert(`오늘 급여 한도(${dailyMax}회)에 도달했어요.`)
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
            💡 오늘 업무일지를 쓴 공무원만 급여를 받을 수 있어요 · 하루 최대 {dailyMax}회 · 30분 간격 · 전체 최대 {totalMax}회
          </div>

          {officers.map(o => {
            const name = o.nickname ?? `${o.number}번`
            const todayCnt = todayPaid[o.id] ?? 0
            const totalCnt = totalPaid[o.id] ?? 0
            const dailyDone = todayCnt >= dailyMax
            const totalDone = totalCnt >= totalMax
            const cooldown = cooldowns[o.id]

            const borderColor = totalDone ? 'border-red-100' : dailyDone ? 'border-green-200' : 'border-gray-100'
            const headerBg = totalDone ? 'bg-red-50' : dailyDone ? 'bg-green-50' : 'bg-gray-50'

            return (
              <div key={o.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden border-2 transition-colors ${borderColor}`}>

                <div className={`flex items-center justify-between px-5 py-4 ${headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏛️</span>
                    <div>
                      <div className="font-bold text-gray-800">공무원 {name}</div>
                      <div className="text-xs text-gray-400">{WAGE.officer.toLocaleString()}원</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold rounded-full px-2.5 py-1
                      ${totalDone ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      전체 {totalCnt}/{totalMax}회
                    </span>
                    {dailyDone && !totalDone && <span className="text-green-600 font-bold text-sm">✓ 오늘 완료</span>}
                    {totalDone && <span className="text-red-500 font-bold text-sm">🚫 한도 종료</span>}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-gray-500">📝 오늘 업무일지</div>
                    <div className="text-xs text-gray-400">오늘 {todayCnt}/{dailyMax}회 지급</div>
                  </div>
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
                      ⚠️ 오늘 업무일지가 없어요 — 일지를 써야 급여를 받을 수 있어요
                    </div>
                  )}
                </div>

                {!totalDone && !dailyDone && (
                  <div className="px-5 pb-4">
                    {cooldown ? (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl py-3 text-center text-sm text-orange-600 font-bold">
                        ⏱ {cooldown}분 후 다시 지급 가능
                      </div>
                    ) : !o.worklog ? (
                      <div className="bg-gray-100 rounded-2xl py-3 text-center text-sm text-gray-400">
                        업무일지 작성 후 지급 가능
                      </div>
                    ) : (
                      <button onClick={() => pay(o.id)} disabled={busy === o.id}
                        className="w-full bg-blue-500 text-white rounded-2xl py-3 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform">
                        {busy === o.id ? '지급 중...' : `🏛️ ${WAGE.officer.toLocaleString()}원 지급하기`}
                      </button>
                    )}
                  </div>
                )}

                {totalDone && (
                  <div className="px-5 pb-4">
                    <div className="bg-red-50 border border-red-200 rounded-2xl py-3 text-center text-sm text-red-500 font-bold">
                      전체 급여 한도({totalMax}회) 완료
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
