'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { WAGE, MIN_STAFF_PER_COMPANY } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface Member { id: string; number: number; nickname: string | null; role: string }
interface Worklog { id: string; text: string; status: string; feedback: string | null; created_at: string }

export default function PayrollList({ stage, members, worklogsMap,
  notCeo, totalPaidMap, todayPaidMap, totalMax = 6, dailyMax = 2 }: {
  stage: Stage
  members: Member[]
  worklogsMap?: Record<string, Worklog[]>
  paidToday?: string[]
  notCeo?: boolean
  totalPaidMap: Record<string, number>
  todayPaidMap: Record<string, number>
  totalMax?: number
  dailyMax?: number
}) {
  const [logs, setLogs] = useState<Record<string, Worklog[]>>(worklogsMap ?? {})
  const [todayPaid, setTodayPaid] = useState<Record<string, number>>(todayPaidMap)
  const [totalPaid, setTotalPaid] = useState<Record<string, number>>(totalPaidMap)
  const [busy, setBusy] = useState<string | null>(null)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [rejectOpen, setRejectOpen] = useState<string | null>(null)
  const [rejectText, setRejectText] = useState('')

  if (notCeo) return (
    <PageShell title="급여 지급" emoji="💵">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 급여를 줄 수 있어요.</div>
    </PageShell>
  )

  const staffCount = members.filter(m => m.role !== 'ceo').length
  const needMore = staffCount < MIN_STAFF_PER_COMPANY

  function setWorklog(memberId: string, worklogId: string, patch: Partial<Worklog>) {
    setLogs(prev => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).map(w => w.id === worklogId ? { ...w, ...patch } : w),
    }))
  }

  async function payAndApprove(m: Member, w: Worklog) {
    setBusy(w.id)
    const res = await fetch('/api/payroll', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worklogId: w.id }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setWorklog(m.id, w.id, { status: 'paid' })
      setTodayPaid(p => ({ ...p, [m.id]: (p[m.id] ?? 0) + 1 }))
      setTotalPaid(p => ({ ...p, [m.id]: (p[m.id] ?? 0) + 1 }))
    } else if (d.error === 'cooldown') {
      setCooldowns(p => ({ ...p, [m.id]: d.remainingMinutes }))
      alert(`아직 ${d.remainingMinutes}분 더 기다려야 해요. (지급 간격 30분)`)
    } else if (d.error === 'total_limit_reached') {
      alert(`전체 급여 한도(${totalMax}회)에 도달했어요.`)
    } else if (d.error === 'daily_limit_reached') {
      alert(`오늘 급여 한도(${dailyMax}회)에 도달했어요.`)
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  async function reject(m: Member, w: Worklog) {
    setBusy(w.id)
    const res = await fetch('/api/worklog/reject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worklogId: w.id, feedback: rejectText.trim() }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setWorklog(m.id, w.id, { status: 'rejected', feedback: rejectText.trim() || null })
      setRejectOpen(null)
      setRejectText('')
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

      <div className="bg-blue-50 rounded-2xl px-4 py-3 text-sm text-blue-700 mb-4">
        💡 업무일지를 확인하고 <b>승인하고 지급</b>하면 급여가 나가요 · 하루 최대 {dailyMax}회 · 30분 간격 · 전체 최대 {totalMax}회
      </div>

      <div className="flex flex-col gap-4">
        {members.map(m => {
          const wage = m.role === 'ceo' ? WAGE.ceo : WAGE.staff
          const todayCnt = todayPaid[m.id] ?? 0
          const totalCnt = totalPaid[m.id] ?? 0
          const dailyDone = todayCnt >= dailyMax
          const totalDone = totalCnt >= totalMax
          const cooldown = cooldowns[m.id]
          const name = m.nickname ?? `${m.number}번`
          const myLogs = logs[m.id] ?? []

          return (
            <div key={m.id} className="bg-white rounded-3xl shadow-sm overflow-hidden border-2 border-gray-100">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{m.role === 'ceo' ? '👑' : '🛠️'}</span>
                  <div>
                    <div className="font-bold text-gray-800">{name}{m.role === 'ceo' ? ' (나)' : ''}</div>
                    <div className="text-xs text-gray-400">{wage.toLocaleString()}원</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold rounded-full px-2.5 py-1
                    ${totalDone ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    전체 {totalCnt}/{totalMax}회
                  </span>
                  <span className="text-xs font-bold rounded-full px-2.5 py-1 bg-gray-100 text-gray-500">
                    오늘 {todayCnt}/{dailyMax}회
                  </span>
                </div>
              </div>

              {/* 오늘 업무일지 목록 */}
              <div className="px-5 py-4 flex flex-col gap-3">
                {myLogs.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                    ⚠️ 오늘 업무일지를 아직 안 썼어요
                  </div>
                )}

                {myLogs.map(w => (
                  <div key={w.id} className="border-2 border-gray-100 rounded-2xl p-4">
                    <p className="text-sm text-gray-800 leading-relaxed mb-2">{w.text}</p>

                    {w.status === 'paid' && (
                      <div className="text-sm font-bold text-green-600">💰 지급완료</div>
                    )}

                    {w.status === 'rejected' && (
                      <div className="text-sm font-bold text-red-500">
                        ✗ 반려됨 — 학생이 수정 중
                        {w.feedback && <div className="text-xs font-normal text-red-500 mt-1">사유: {w.feedback}</div>}
                      </div>
                    )}

                    {w.status === 'submitted' && (
                      rejectOpen === w.id ? (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex flex-col gap-2">
                          <label className="text-xs font-bold text-red-600">반려 사유 (학생에게 보여요)</label>
                          <textarea value={rejectText} onChange={e => setRejectText(e.target.value)}
                            maxLength={500} rows={2} placeholder="예: 무슨 일을 했는지 더 자세히 써주세요"
                            className="w-full border-2 border-red-200 rounded-lg px-3 py-2 text-sm focus:border-red-400 outline-none resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => reject(m, w)} disabled={busy === w.id || !rejectText.trim()}
                              className="flex-1 bg-red-500 text-white rounded-lg py-2.5 font-bold text-sm disabled:opacity-40">
                              반려하기
                            </button>
                            <button onClick={() => { setRejectOpen(null); setRejectText('') }}
                              className="flex-1 border-2 border-gray-200 text-gray-500 rounded-lg py-2.5 font-medium text-sm">
                              취소
                            </button>
                          </div>
                        </div>
                      ) : cooldown ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl py-2.5 text-center text-sm text-orange-600 font-bold">
                          ⏱ {cooldown}분 후 지급 가능
                        </div>
                      ) : totalDone ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl py-2.5 text-center text-sm text-red-500 font-bold">
                          전체 급여 한도({totalMax}회) 완료
                        </div>
                      ) : dailyDone ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl py-2.5 text-center text-sm text-green-600 font-bold">
                          오늘 지급 완료 — 내일 또는 다음 일지에 지급
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => payAndApprove(m, w)} disabled={busy === w.id}
                            className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
                            {busy === w.id ? '...' : `✓ 승인하고 ${wage.toLocaleString()}원 지급`}
                          </button>
                          <button onClick={() => { setRejectOpen(w.id); setRejectText('') }} disabled={busy === w.id}
                            className="px-4 border-2 border-red-200 text-red-500 rounded-xl py-2.5 font-medium text-sm disabled:opacity-40">
                            ✗ 반려
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
