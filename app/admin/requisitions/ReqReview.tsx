'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ReqItem { name: string; qty: number; price: number }
interface DroppedItem { name: string; reason: string }
interface CompanyUser { number: number; nickname: string | null; role: string }
interface ReqCompany { display_name: string; icon?: string | null; users?: CompanyUser | CompanyUser[] | null }

interface Req {
  id: string
  company_id: string
  items: ReqItem[]
  dropped_items: DroppedItem[]
  total: number
  status: string
  created_at: string
  companies: ReqCompany | ReqCompany[] | null
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  return `${Math.floor(min / 60)}시간 전`
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
    if (res.ok) {
      setStates(s => ({ ...s, [reqId]: action === 'approve' ? 'approved' : 'rejected' }))
    } else {
      const d = await res.json()
      alert(d.error === '잔액이 부족합니다.' ? '회사 잔액 부족' : `오류: ${d.error}`)
    }
  }

  const pendingCount = reqs.filter(r => states[r.id] === 'submitted').length

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push('/home')} className="text-gray-400 text-sm mb-4">← 교사 홈</button>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🧾 품의서 결재</h1>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              대기 {pendingCount}건
            </span>
          )}
        </div>

        {reqs.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400">품의서가 없어요.</div>
        )}

        {/* 대기 중 먼저, 처리 완료 나중 */}
        {['submitted', 'approved', 'rejected'].map(statusGroup => {
          const group = reqs.filter(r => states[r.id] === statusGroup)
          if (group.length === 0) return null
          const groupLabel = statusGroup === 'submitted' ? '⏳ 결재 대기' : statusGroup === 'approved' ? '✅ 승인됨' : '✕ 반려됨'
          return (
            <div key={statusGroup} className="mb-6">
              <div className="text-sm font-bold text-gray-500 mb-2 px-1">{groupLabel} {group.length}건</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.map(r => {
                  const comp = Array.isArray(r.companies) ? r.companies[0] : r.companies
                  const ceo = comp?.users
                    ? (Array.isArray(comp.users)
                      ? comp.users.find((u: CompanyUser) => u.role === 'ceo') ?? comp.users[0]
                      : comp.users)
                    : null
                  const ceoName = ceo ? (ceo.nickname ?? `${ceo.number}번`) : null
                  const st = states[r.id]
                  const items: ReqItem[] = Array.isArray(r.items) ? r.items : []
                  const dropped: DroppedItem[] = Array.isArray(r.dropped_items) ? r.dropped_items : []

                  return (
                    <div key={r.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4
                      ${st === 'submitted' ? 'border-amber-400' : st === 'approved' ? 'border-emerald-400' : 'border-gray-300'}`}>

                      {/* 헤더 */}
                      <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-gray-800 text-base">
                              {comp?.icon && <span className="mr-1">{comp.icon}</span>}
                              {comp?.display_name ?? '-'}
                            </div>
                            {ceoName && (
                              <div className="text-xs text-gray-500 mt-0.5">대표 {ceoName}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-black text-lg text-blue-700">{r.total.toLocaleString()}원</div>
                            <div className="text-xs text-gray-400">{timeAgo(r.created_at)}</div>
                          </div>
                        </div>
                      </div>

                      {/* 구매 항목 */}
                      <div className="px-5 py-3">
                        <div className="text-xs font-bold text-gray-500 mb-2">📦 구매 항목</div>
                        <div className="space-y-1.5">
                          {items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 font-medium">{it.name}</span>
                              <div className="flex items-center gap-3 text-gray-500 text-xs">
                                <span>{it.qty}개 × {it.price.toLocaleString()}원</span>
                                <span className="font-bold text-gray-700">{(it.qty * it.price).toLocaleString()}원</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 기회비용 (포기한 항목) */}
                      {dropped.length > 0 && (
                        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                          <div className="text-xs font-bold text-amber-700 mb-1.5">🤔 포기한 항목 (기회비용)</div>
                          <div className="space-y-1">
                            {dropped.map((d, i) => (
                              <div key={i} className="text-xs text-amber-800">
                                <span className="font-medium">{d.name}</span>
                                {d.reason && <span className="text-amber-600"> — {d.reason}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 결재 버튼 */}
                      <div className="px-5 py-4 border-t border-gray-100">
                        {st === 'submitted' ? (
                          <div className="flex gap-2">
                            <button onClick={() => act(r.id, 'approve')} disabled={busy === r.id}
                              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-base disabled:opacity-40 hover:bg-emerald-600 transition-colors">
                              ✓ 승인
                            </button>
                            <button onClick={() => act(r.id, 'reject')} disabled={busy === r.id}
                              className="px-6 py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium disabled:opacity-40 hover:bg-red-50 transition-colors">
                              반려
                            </button>
                          </div>
                        ) : (
                          <div className={`text-sm font-bold text-center py-1.5 rounded-xl
                            ${st === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {st === 'approved' ? '✓ 승인됨' : '✕ 반려됨'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
