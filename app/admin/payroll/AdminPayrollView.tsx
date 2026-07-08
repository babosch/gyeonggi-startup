'use client'

import { useState } from 'react'
import Link from 'next/link'
import { WAGE } from '@/lib/constants'

interface Worklog { id: string; text: string; status: string; feedback: string | null; created_at: string }
interface Member { id: string; number: number; nickname: string | null; role: string; worklogs: Worklog[]; totalPaid: number; todayPaid: number }
interface Company { id: string; name: string; icon: string | null; members: Member[] }

export default function AdminPayrollView({ companies: initial, totalMax = 6, dailyMax = 2 }: {
  companies: Company[]; totalMax?: number; dailyMax?: number
}) {
  const [companies, setCompanies] = useState<Company[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [rejectOpen, setRejectOpen] = useState<string | null>(null)
  const [rejectText, setRejectText] = useState('')

  function patchWorklog(memberId: string, worklogId: string, patch: Partial<Worklog>, paidDelta = 0) {
    setCompanies(prev => prev.map(c => ({
      ...c,
      members: c.members.map(m => m.id !== memberId ? m : {
        ...m,
        worklogs: m.worklogs.map(w => w.id === worklogId ? { ...w, ...patch } : w),
        totalPaid: m.totalPaid + paidDelta,
        todayPaid: m.todayPaid + paidDelta,
      }),
    })))
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
      patchWorklog(m.id, w.id, { status: 'paid' }, 1)
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
      patchWorklog(m.id, w.id, { status: 'rejected', feedback: rejectText.trim() || null })
      setRejectOpen(null)
      setRejectText('')
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/home" className="text-gray-400 text-sm mb-4 inline-block">← 교사 홈</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">💵 급여 지급 (교사)</h1>
        <p className="text-sm text-gray-400 mb-5">
          CEO가 없을 때 시장이 대신 직원 업무일지를 승인하고 급여를 줘요. 하루 {dailyMax}회 · 전체 {totalMax}회 한도.
        </p>

        {companies.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 선정된 회사가 없어요.</div>
        ) : (
          <div className="flex flex-col gap-5">
            {companies.map(c => (
              <div key={c.id}>
                <div className="font-bold text-gray-800 mb-2 px-1">{c.icon ?? '🏢'} {c.name}</div>
                <div className="flex flex-col gap-3">
                  {c.members.map(m => {
                    const wage = m.role === 'ceo' ? WAGE.ceo : WAGE.staff
                    const dailyDone = m.todayPaid >= dailyMax
                    const totalDone = m.totalPaid >= totalMax
                    const cooldown = cooldowns[m.id]
                    const name = m.nickname ?? `${m.number}번`
                    return (
                      <div key={m.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-gray-100">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span>{m.role === 'ceo' ? '👑' : '🛠️'}</span>
                            <span className="font-bold text-gray-800 text-sm">{name}</span>
                            <span className="text-xs text-gray-400">{wage.toLocaleString()}원</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${totalDone ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>전체 {m.totalPaid}/{totalMax}</span>
                            <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-gray-100 text-gray-500">오늘 {m.todayPaid}/{dailyMax}</span>
                          </div>
                        </div>
                        <div className="px-4 py-3 flex flex-col gap-2">
                          {m.worklogs.length === 0 && (
                            <div className="text-sm text-amber-600">⚠️ 오늘 업무일지 없음</div>
                          )}
                          {m.worklogs.map(w => (
                            <div key={w.id} className="border border-gray-100 rounded-xl p-3">
                              <p className="text-sm text-gray-800 mb-2">{w.text}</p>
                              {w.status === 'paid' && <div className="text-sm font-bold text-green-600">💰 지급완료</div>}
                              {w.status === 'rejected' && (
                                <div className="text-sm font-bold text-red-500">✗ 반려됨
                                  {w.feedback && <span className="text-xs font-normal"> — {w.feedback}</span>}
                                </div>
                              )}
                              {w.status === 'submitted' && (
                                rejectOpen === w.id ? (
                                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 flex flex-col gap-2">
                                    <textarea value={rejectText} onChange={e => setRejectText(e.target.value)}
                                      maxLength={500} rows={2} placeholder="반려 사유"
                                      className="w-full border-2 border-red-200 rounded-lg px-2 py-1.5 text-sm focus:border-red-400 outline-none resize-none" />
                                    <div className="flex gap-2">
                                      <button onClick={() => reject(m, w)} disabled={busy === w.id || !rejectText.trim()}
                                        className="flex-1 bg-red-500 text-white rounded-lg py-2 font-bold text-sm disabled:opacity-40">반려하기</button>
                                      <button onClick={() => { setRejectOpen(null); setRejectText('') }}
                                        className="flex-1 border-2 border-gray-200 text-gray-500 rounded-lg py-2 font-medium text-sm">취소</button>
                                    </div>
                                  </div>
                                ) : cooldown ? (
                                  <div className="bg-orange-50 rounded-lg py-2 text-center text-sm text-orange-600 font-bold">⏱ {cooldown}분 후 지급 가능</div>
                                ) : totalDone ? (
                                  <div className="bg-red-50 rounded-lg py-2 text-center text-sm text-red-500 font-bold">전체 한도 완료</div>
                                ) : dailyDone ? (
                                  <div className="bg-green-50 rounded-lg py-2 text-center text-sm text-green-600 font-bold">오늘 지급 완료</div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button onClick={() => payAndApprove(m, w)} disabled={busy === w.id}
                                      className="flex-1 bg-blue-500 text-white rounded-lg py-2 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
                                      {busy === w.id ? '...' : `✓ 승인하고 ${wage.toLocaleString()}원 지급`}
                                    </button>
                                    <button onClick={() => { setRejectOpen(w.id); setRejectText('') }} disabled={busy === w.id}
                                      className="px-3 border-2 border-red-200 text-red-500 rounded-lg py-2 font-medium text-sm disabled:opacity-40">✗ 반려</button>
                                  </div>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {c.members.length === 0 && <div className="text-sm text-gray-400 px-1">직원이 없어요.</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
