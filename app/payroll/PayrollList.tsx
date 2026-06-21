'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { WAGE, MIN_STAFF_PER_COMPANY } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface Member { id: string; number: number; nickname: string | null; role: string }
interface WorklogEntry { text: string; created_at: string }

export default function PayrollList({ stage, members, paidToday, notCeo, latestLogMap, maxStaff = 6, stagePaidCountMap, stageMax }: {
  stage: Stage; members: Member[]; paidToday: string[]
  notCeo?: boolean; latestLogMap?: Record<string, WorklogEntry>; maxStaff?: number
  stagePaidCountMap: Record<string, number>; stageMax: number | undefined
}) {
  const [paid, setPaid] = useState<string[]>(paidToday)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  if (notCeo) return (
    <PageShell title="급여 지급" emoji="💵">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 급여를 줄 수 있어요.</div>
    </PageShell>
  )

  const staffCount = members.filter(m => m.role !== 'ceo').length
  const needMore = staffCount < MIN_STAFF_PER_COMPANY

  function confirm(id: string) {
    setConfirmed(prev => { const next = new Set(prev); next.add(id); return next })
  }

  async function pay(m: Member) {
    setBusy(m.id)
    const res = await fetch('/api/payroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: m.id }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setPaid(prev => [...prev, m.id])
    } else if (d.error === 'payroll_limit_reached') {
      alert(`이번 단계 급여 한도에 도달했어요. (${d.paid}/${d.max}일)`)
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  return (
    <PageShell title="급여 지급" emoji="💵">
      {needMore && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 mb-4">
          ⚠️ 직원 {staffCount}명 / 최소 {MIN_STAFF_PER_COMPANY}명 필요 — 채용을 더 해야 해요
        </div>
      )}

      <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700 mb-2">
        💡 업무일지를 확인한 다음 급여를 지급해요 · 하루에 한 번만 줄 수 있어요
        {stageMax !== undefined && (
          <span className="ml-2 font-bold">· 이번 단계 최대 {stageMax}일</span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {members.map(m => {
          const wage = m.role === 'ceo' ? WAGE.ceo : WAGE.staff
          const done = paid.includes(m.id)
          const isConfirmed = confirmed.has(m.id) || done
          const log = latestLogMap?.[m.id]
          const name = m.nickname ?? `${m.number}번`
          const stagePaid = stagePaidCountMap[m.id] ?? 0
          const limitReached = stageMax !== undefined && stagePaid >= stageMax

          return (
            <div key={m.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden border-2 transition-colors
              ${done ? 'border-green-200' : limitReached ? 'border-red-100' : isConfirmed ? 'border-blue-200' : 'border-gray-100'}`}>

              {/* 헤더 */}
              <div className={`flex items-center justify-between px-5 py-4
                ${done ? 'bg-green-50' : limitReached ? 'bg-red-50' : isConfirmed ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.role === 'ceo' ? '👑' : '🛠️'}</span>
                  <div>
                    <div className="font-bold text-gray-800">{name}</div>
                    <div className="text-xs text-gray-400">{wage.toLocaleString()}원</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stageMax !== undefined && (
                    <span className={`text-xs font-bold rounded-full px-2.5 py-1
                      ${limitReached ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {stagePaid}/{stageMax}일
                    </span>
                  )}
                  {done && !limitReached && (
                    <span className="text-green-600 font-bold text-sm">✓ 오늘 완료</span>
                  )}
                  {limitReached && (
                    <span className="text-red-500 font-bold text-sm">🚫 한도 도달</span>
                  )}
                </div>
              </div>

              {/* 업무일지 */}
              <div className="px-5 py-4 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-500 mb-2">📝 최근 업무일지</div>
                {log ? (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm text-gray-800 leading-relaxed">{log.text}</p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(log.created_at).toLocaleDateString('ko-KR', {
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

              {/* 확인 → 지급 흐름 */}
              {!done && !limitReached && (
                <div className="px-5 pb-4">
                  {!isConfirmed ? (
                    <button onClick={() => confirm(m.id)}
                      className="w-full bg-gray-100 text-gray-700 rounded-2xl py-3 font-bold text-sm hover:bg-gray-200 transition-colors active:scale-95">
                      ✓ 업무일지 확인했어요
                    </button>
                  ) : (
                    <button onClick={() => pay(m)} disabled={busy === m.id}
                      className="w-full bg-blue-500 text-white rounded-2xl py-3 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform">
                      {busy === m.id ? '지급 중...' : `💵 ${wage.toLocaleString()}원 지급하기`}
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
    </PageShell>
  )
}
