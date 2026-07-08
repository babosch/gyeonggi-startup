'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MAX_COMPANIES_PER_CLASS, GRANT_AMOUNT } from '@/lib/constants'

interface SalesItem { name: string; qty: number; price: number }
interface Plan {
  id: string
  user_id: string
  content: {
    companyName?: string
    // 신 포맷
    salesItems?: SalesItem[]
    // 구 포맷 호환
    whatToSell?: string
    products?: { name: string }[]
    items?: { name: string; qty: number; price: number }[]
    target?: string
    useSpecialty?: boolean
    specialtyDetail?: string
    reason?: string
  }
  reserve_amount: number
  status: string
  users: { number: number; nickname: string | null } | { number: number; nickname: string | null }[]
}

function expectedRevenue(c: Plan['content']): number {
  if (c.salesItems?.length) {
    return c.salesItems.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0)
  }
  // 구 포맷(items = 재료구입 합계)는 매출 아님 → 0
  return 0
}

export default function PlanReview({ plans, selectedCount }: {
  plans: Plan[]
  selectedCount: number
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [count, setCount] = useState(selectedCount)
  // 각 계획서별 추가금 (0 = 미지급, 10000~20000)
  const [bonuses, setBonuses] = useState<Record<string, number>>(
    Object.fromEntries(plans.map(p => [p.id, 0]))
  )
  // 반려 사유 입력 열림 + 내용
  const [rejectOpen, setRejectOpen] = useState<string | null>(null)
  const [rejectText, setRejectText] = useState('')

  async function act(planId: string, action: 'select' | 'cancel') {
    setBusy(planId)
    const bonusAmount = action === 'select' ? (bonuses[planId] ?? 0) : 0
    const res = await fetch('/api/admin/select-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, action, bonusAmount }),
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

  async function reject(planId: string) {
    setBusy(planId)
    const res = await fetch('/api/admin/select-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, action: 'reject', feedback: rejectText.trim() }),
    })
    const data = await res.json()
    setBusy(null)
    if (res.ok) {
      setRejectOpen(null)
      setRejectText('')
      router.refresh()
    } else {
      alert(`오류: ${data.error}`)
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

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-amber-800">
          💡 추가금은 특산품 연계 여부와 무관하게 <b>0원 ~ 20,000원</b> 범위에서 자유롭게 지급할 수 있어요.<br />
          선정 버튼을 누르면 기본 지원금({GRANT_AMOUNT.toLocaleString()}원) + 추가금이 함께 지급됩니다.
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
            const rev = expectedRevenue(c)
            const bonus = bonuses[p.id] ?? 0
            const totalGrant = GRANT_AMOUNT + bonus

            return (
              <div key={p.id} className={`bg-white rounded-3xl p-6 shadow-sm border-2
                ${isSelected ? 'border-green-300' : 'border-transparent'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-gray-800">{c.companyName ?? '(이름 없음)'}</span>
                    {c.useSpecialty && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ 특산품</span>
                    )}
                    {isSelected && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">선정됨</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{u?.nickname ?? `${u?.number}번`}</span>
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>🙋 <b>판매 대상:</b> {c.target ?? '-'}</p>
                  {c.useSpecialty && c.specialtyDetail && (
                    <p>⭐ <b>특산품 활용:</b> {c.specialtyDetail}</p>
                  )}
                  <p>💡 <b>필요한 이유:</b> {c.reason ?? '-'}</p>

                  {/* 판매 계획 표 */}
                  {c.salesItems && c.salesItems.length > 0 && (
                    <div className="mt-2">
                      <p className="font-bold text-gray-700 mb-1">📊 판매 계획</p>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left py-1 px-2 border border-gray-200">물건 이름</th>
                            <th className="text-center py-1 px-2 border border-gray-200">예상 갯수</th>
                            <th className="text-center py-1 px-2 border border-gray-200">판매 단가</th>
                            <th className="text-right py-1 px-2 border border-gray-200">소계</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.salesItems.map((it, i) => (
                            <tr key={i}>
                              <td className="py-1 px-2 border border-gray-200">{it.name}</td>
                              <td className="text-center py-1 px-2 border border-gray-200">{it.qty}개</td>
                              <td className="text-center py-1 px-2 border border-gray-200">{it.price.toLocaleString()}원</td>
                              <td className="text-right py-1 px-2 border border-gray-200 font-medium">
                                {(it.qty * it.price).toLocaleString()}원
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-right text-sm font-bold text-blue-600 mt-1">
                        총 예상 매출: {rev.toLocaleString()}원
                      </p>
                    </div>
                  )}
                  {/* 구 포맷 fallback */}
                  {!c.salesItems && c.whatToSell && (
                    <p>🎨 <b>무엇:</b> {c.whatToSell}</p>
                  )}
                </div>

                {/* 추가금 슬라이더 (미선정 상태만) */}
                {!isSelected && (
                  <div className="mb-4 bg-gray-50 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">추가금 지급</span>
                      <span className={`text-sm font-bold ${bonus > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {bonus > 0 ? `+${bonus.toLocaleString()}원` : '미지급'}
                      </span>
                    </div>
                    <input type="range" min={0} max={20000} step={1000}
                      value={bonus}
                      onChange={e => setBonuses({ ...bonuses, [p.id]: +e.target.value })}
                      className="w-full" />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0원</span>
                      <span>10,000원</span>
                      <span>20,000원</span>
                    </div>
                    {bonus > 0 && (
                      <div className="mt-2 text-center text-sm font-medium text-green-700 bg-green-50 rounded-xl py-2">
                        선정 시 총 지원금: {totalGrant.toLocaleString()}원
                      </div>
                    )}
                  </div>
                )}

                {isSelected ? (
                  <button onClick={() => act(p.id, 'cancel')} disabled={busy === p.id}
                    className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium disabled:opacity-50">
                    {busy === p.id ? '...' : '선정 취소'}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button onClick={() => act(p.id, 'select')}
                      disabled={busy === p.id || count >= MAX_COMPANIES_PER_CLASS}
                      className={`w-full py-3 rounded-xl font-bold disabled:opacity-40 text-white
                        ${bonus > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                      {busy === p.id ? '...'
                        : bonus > 0
                          ? `선정 + 추가금 ${bonus.toLocaleString()}원 지급`
                          : '선정'}
                    </button>

                    {rejectOpen === p.id ? (
                      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col gap-2">
                        <label className="text-sm font-bold text-red-600">반려 사유 (학생에게 보여요)</label>
                        <textarea value={rejectText} onChange={e => setRejectText(e.target.value)}
                          maxLength={500} rows={2} placeholder="예: 판매 대상을 더 구체적으로 적어주세요"
                          className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => reject(p.id)} disabled={busy === p.id || !rejectText.trim()}
                            className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-40">
                            {busy === p.id ? '...' : '반려하기'}
                          </button>
                          <button onClick={() => { setRejectOpen(null); setRejectText('') }}
                            className="flex-1 border-2 border-gray-200 text-gray-500 rounded-xl py-2.5 font-medium text-sm">
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setRejectOpen(p.id); setRejectText('') }}
                        disabled={busy === p.id}
                        className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-500 font-medium text-sm disabled:opacity-40">
                        ✕ 반려 (수정 요청)
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
