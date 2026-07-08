'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface FacilityUse {
  id: string
  companyName: string
  facilityName: string
  unit: string
  quantity: number
  unitPrice: number
  totalAmount: number
  memo: string | null
  status: string
  feedback: string | null
  createdAt: string
}

// 공무원·시장이 시설 사용 신청을 승인/반려하는 목록.
export default function FacilityUseReview({ uses: initial }: { uses: FacilityUse[] }) {
  const router = useRouter()
  const [uses, setUses] = useState<FacilityUse[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState<string | null>(null)
  const [rejectText, setRejectText] = useState('')

  async function act(id: string, action: 'approve' | 'reject' | 'cancel', feedback?: string) {
    if (action === 'cancel' && !confirm('이 승인을 취소하고 회사에 금액을 돌려줄까요?')) return
    setBusy(id)
    const res = await fetch('/api/admin/approve-facility-use', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityUseId: id, action, feedback }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending'
      setUses(prev => prev.map(u => u.id === id ? { ...u, status: nextStatus, feedback: action === 'reject' ? (feedback ?? u.feedback) : null } : u))
      setRejectOpen(null)
      setRejectText('')
      router.refresh()
    } else if (d.error === '잔액이 부족합니다.') {
      alert(action === 'cancel' ? '시청 잔액이 부족해 환불할 수 없어요' : '회사 잔액이 부족해 승인할 수 없어요')
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  const pending = uses.filter(u => u.status === 'pending')

  return (
    <div className="flex flex-col gap-4">
      {['pending', 'approved', 'rejected'].map(group => {
        const list = uses.filter(u => u.status === group)
        if (list.length === 0) return null
        const label = group === 'pending' ? '⏳ 승인 대기' : group === 'approved' ? '✅ 승인됨' : '✕ 반려됨'
        return (
          <div key={group}>
            <div className="text-sm font-bold text-gray-500 mb-2 px-1">{label} {list.length}건</div>
            <div className="flex flex-col gap-3">
              {list.map(u => (
                <div key={u.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4
                  ${u.status === 'pending' ? 'border-amber-400' : u.status === 'approved' ? 'border-emerald-400' : 'border-gray-300'}`}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="font-bold text-gray-800">🏢 {u.companyName}</div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          🏪 {u.facilityName} · {u.quantity}{u.unit}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-lg text-blue-700">
                          {(u.status === 'approved' ? u.totalAmount : u.unitPrice * u.quantity).toLocaleString()}원
                        </div>
                        <div className="text-xs text-gray-400">{u.unitPrice.toLocaleString()}원/{u.unit}</div>
                      </div>
                    </div>
                    {u.memo && <div className="text-xs text-blue-600 mt-1">→ {u.memo}</div>}
                    {u.status === 'rejected' && u.feedback && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                        반려 사유: {u.feedback}
                      </div>
                    )}
                  </div>

                  {u.status === 'approved' && (
                    <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                      <button onClick={() => act(u.id, 'cancel')} disabled={busy === u.id}
                        className="w-full border-2 border-orange-200 text-orange-600 rounded-xl py-2.5 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
                        {busy === u.id ? '...' : '↩️ 승인 취소 (환불)'}
                      </button>
                    </div>
                  )}

                  {u.status === 'pending' && (
                    <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                      {rejectOpen === u.id ? (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex flex-col gap-2">
                          <label className="text-xs font-bold text-red-600">반려 사유 (사장에게 보여요)</label>
                          <textarea value={rejectText} onChange={e => setRejectText(e.target.value)}
                            maxLength={500} rows={2} placeholder="예: 지금은 시설 사용이 어려워요"
                            className="w-full border-2 border-red-200 rounded-lg px-3 py-2 text-sm focus:border-red-400 outline-none resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => act(u.id, 'reject', rejectText.trim())} disabled={busy === u.id || !rejectText.trim()}
                              className="flex-1 bg-red-500 text-white rounded-lg py-2.5 font-bold text-sm disabled:opacity-40">
                              반려하기
                            </button>
                            <button onClick={() => { setRejectOpen(null); setRejectText('') }}
                              className="flex-1 border-2 border-gray-200 text-gray-500 rounded-lg py-2.5 font-medium text-sm">
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => act(u.id, 'approve')} disabled={busy === u.id}
                            className="flex-1 bg-emerald-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
                            {busy === u.id ? '...' : `✓ 승인하고 ${(u.unitPrice * u.quantity).toLocaleString()}원 차감`}
                          </button>
                          <button onClick={() => { setRejectOpen(u.id); setRejectText('') }} disabled={busy === u.id}
                            className="px-4 border-2 border-red-200 text-red-500 rounded-xl py-2.5 font-medium text-sm disabled:opacity-40">
                            ✗ 반려
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {pending.length === 0 && uses.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center text-gray-400">
          아직 들어온 시설 사용 신청이 없어요.
        </div>
      )}
    </div>
  )
}
