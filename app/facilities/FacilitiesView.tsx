'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

interface Facility { id: string; name: string; unit: string; price: number }

export default function FacilitiesView({ stage, role, facilities: initial, companyBalance, cityBalance }: {
  stage: Stage; role: string; facilities: Facility[]; companyBalance: number; cityBalance: number
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

  if (stage < 1) return <PageShell title="공용 시설" emoji="🏪" locked={{ opensAt: '창업' }}>{null}</PageShell>

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
      </PageShell>
    )
  }

  // ── CEO 화면 (이용) ──
  if (role === 'ceo') {
    async function useFacility() {
      if (!useTarget) return
      setBusy(true)
      const res = await fetch('/api/facility-use', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: useTarget.id, quantity: qty, memo }),
      })
      const d = await res.json()
      setBusy(false)
      if (res.ok) { setBal(b => b - useTarget.price * qty); setUseTarget(null); setQty(1); setMemo(''); alert('시설을 이용했어요!') }
      else alert(d.error === '잔액이 부족합니다.' ? '회사 잔액이 부족해요' : `오류: ${d.error}`)
    }
    return (
      <PageShell title="공용 시설 이용" emoji="🏪">
        <div className="bg-blue-50 rounded-2xl p-4 text-center mb-4">
          <span className="text-sm text-blue-600">회사 잔액</span>
          <div className="text-2xl font-bold text-blue-700">{bal.toLocaleString()}원</div>
        </div>
        {facilities.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-gray-400">아직 등록된 시설이 없어요. 공무원이 등록하면 이용할 수 있어요.</div>
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

        {useTarget && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <div className="font-bold text-lg text-gray-800 mb-1">{useTarget.name} 이용</div>
              <p className="text-sm text-gray-500 mb-4">{useTarget.price.toLocaleString()}원 / {useTarget.unit}</p>
              <label className="block text-sm text-gray-600 mb-1">몇 {useTarget.unit} 이용할까요?</label>
              <input type="number" value={qty} min={1} onChange={e => setQty(+e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 mb-3 text-center" />
              <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="이용 내용 메모"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 mb-3 text-sm" />
              <div className="bg-gray-50 rounded-xl p-3 text-center mb-4">
                합계 <b className="text-blue-600">{(useTarget.price * qty).toLocaleString()}원</b>
              </div>
              <div className="flex gap-2">
                <button onClick={useFacility} disabled={busy}
                  className="flex-1 bg-blue-500 text-white rounded-xl py-3 font-bold disabled:opacity-50">
                  {busy ? '...' : '이용하기'}
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
