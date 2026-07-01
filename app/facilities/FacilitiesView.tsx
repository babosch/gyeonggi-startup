'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import FacilityUseReview, { type FacilityUse } from '@/components/FacilityUseReview'
import type { Stage } from '@/lib/types'

interface Facility { id: string; name: string; unit: string; price: number }

export default function FacilitiesView({ stage, role, facilities: initial, companyBalance, cityBalance, uses }: {
  stage: Stage; role: string; facilities: Facility[]; companyBalance: number; cityBalance: number; uses: FacilityUse[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>(initial)

  // 공무원: 등록 폼
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('회')
  const [price, setPrice] = useState(2000)

  // CEO: 이용
  const [useTarget, setUseTarget] = useState<Facility | null>(null)
  const [qty, setQty] = useState(1)
  const [memo, setMemo] = useState('')
  const [bal, setBal] = useState(companyBalance)
  const [busy, setBusy] = useState(false)


  // ── 공무원 화면 ──
  if (role === 'officer') {
    async function add() {
      if (!name || price < 0) return
      const { data: { user } } = await supabase.auth.getUser()
      const { data: u } = await supabase.from('users').select('class_id').eq('id', user!.id).single()
      const { data } = await supabase.from('facilities')
        .insert({ class_id: u!.class_id, name, unit, price, created_by: user!.id }).select().single()
      if (data) { setFacilities([...facilities, data as Facility]); setName(''); setPrice(2000) }
    }
    async function remove(id: string) {
      await supabase.from('facilities').delete().eq('id', id)
      setFacilities(facilities.filter(f => f.id !== id))
    }
    return (
      <PageShell title="공용 시설 관리" emoji="🏪">
        <div className="bg-blue-50 rounded-2xl p-4 text-center mb-4">
          <span className="text-sm text-blue-600">시청 잔액</span>
          <div className="text-2xl font-bold text-blue-700">{cityBalance.toLocaleString()}원</div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">시설 목록 <span className="text-sm text-gray-400">({facilities.length}/8)</span></div>
          <div className="flex flex-col gap-2 mb-4">
            {facilities.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <span className="font-medium text-gray-700">{f.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{f.price.toLocaleString()}원/{f.unit}</span>
                  <button onClick={() => remove(f.id)} className="text-red-400">✕</button>
                </div>
              </div>
            ))}
          </div>
          {facilities.length < 8 && (
            <div className="flex gap-2 border-t border-gray-100 pt-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="시설 이름" maxLength={15}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="단위" maxLength={4}
                className="w-14 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center" />
              <input type="number" value={price} min={0} onChange={e => setPrice(+e.target.value)}
                className="w-20 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center" />
              <button onClick={add} disabled={!name} className="bg-blue-500 text-white rounded-xl px-3 font-bold text-sm disabled:opacity-40">추가</button>
            </div>
          )}
        </div>

        {/* 시설 사용 신청 목록 (승인/반려) */}
        <div className="mt-4">
          <div className="font-bold text-gray-800 mb-2 px-1">📋 회사들의 시설 사용 신청</div>
          <FacilityUseReview uses={uses} />
        </div>
      </PageShell>
    )
  }

  // ── CEO 화면 (신청) ──
  if (role === 'ceo') {
    async function applyFacility() {
      if (!useTarget) return
      setBusy(true)
      const res = await fetch('/api/facility-use', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: useTarget.id, quantity: qty, memo }),
      })
      const d = await res.json()
      setBusy(false)
      if (res.ok) {
        setUseTarget(null); setQty(1); setMemo('')
        alert('시설 사용을 신청했어요! 공무원·시장이 승인하면 금액이 차감돼요.')
        router.refresh()
      }
      else alert(`오류: ${d.error}`)
    }

    const STATUS = (s: string) =>
      s === 'approved' ? <span className="text-xs font-bold bg-green-100 text-green-700 rounded-full px-2.5 py-1">✅ 승인 (차감됨)</span>
      : s === 'rejected' ? <span className="text-xs font-bold bg-red-100 text-red-600 rounded-full px-2.5 py-1">✕ 반려</span>
      : <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2.5 py-1">⏳ 승인 대기</span>

    return (
      <PageShell title="공용 시설 이용 신청" emoji="🏪">
        <div className="bg-blue-50 rounded-2xl p-4 text-center mb-4">
          <span className="text-sm text-blue-600">회사 잔액</span>
          <div className="text-2xl font-bold text-blue-700">{bal.toLocaleString()}원</div>
          <div className="text-xs text-blue-400 mt-1">승인되면 금액이 차감돼요</div>
        </div>
        {facilities.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-gray-400">아직 등록된 시설이 없어요. 공무원이 등록하면 신청할 수 있어요.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {facilities.map(f => (
              <button key={f.id} onClick={() => setUseTarget(f)}
                className="bg-white rounded-2xl p-4 shadow-sm text-left active:scale-95 transition-transform border-2 border-transparent hover:border-blue-300">
                <div className="font-bold text-gray-800">{f.name}</div>
                <div className="text-sm text-blue-600">{f.price.toLocaleString()}원/{f.unit}</div>
              </button>
            ))}
          </div>
        )}

        {/* 내 신청 내역 */}
        {uses.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm mt-4">
            <div className="font-bold text-gray-800 mb-3">내 시설 사용 신청 내역</div>
            <div className="flex flex-col gap-3">
              {uses.map(u => (
                <div key={u.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800 text-sm">🏪 {u.facilityName} · {u.quantity}{u.unit}</span>
                    {STATUS(u.status)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {(u.status === 'approved' ? u.totalAmount : u.unitPrice * u.quantity).toLocaleString()}원
                    {u.status === 'approved' && ' 차감 완료'}
                    {u.status === 'pending' && ' (승인 시 차감 예정)'}
                  </div>
                  {u.status === 'rejected' && u.feedback && (
                    <div className="mt-1 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                      반려 사유: {u.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {useTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <div className="font-bold text-lg text-gray-800 mb-1">{useTarget.name} 사용 신청</div>
              <p className="text-sm text-gray-500 mb-4">{useTarget.price.toLocaleString()}원 / {useTarget.unit}</p>
              <label className="block text-sm text-gray-600 mb-1">몇 {useTarget.unit} 사용할까요?</label>
              <input type="number" value={qty} min={1} onChange={e => setQty(+e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 mb-3 text-center" />
              <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="사용 내용 메모"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 mb-3 text-sm" />
              <div className="bg-gray-50 rounded-xl p-3 text-center mb-4">
                예상 금액 <b className="text-blue-600">{(useTarget.price * qty).toLocaleString()}원</b>
              </div>
              <div className="flex gap-2">
                <button onClick={applyFacility} disabled={busy}
                  className="flex-1 bg-blue-500 text-white rounded-xl py-3 font-bold disabled:opacity-50">
                  {busy ? '...' : '신청하기'}
                </button>
                <button onClick={() => setUseTarget(null)} className="px-5 bg-gray-100 rounded-xl font-medium">취소</button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    )
  }

  return (
    <PageShell title="공용 시설" emoji="🏪">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO와 공무원이 사용하는 기능이에요.</div>
    </PageShell>
  )
}
