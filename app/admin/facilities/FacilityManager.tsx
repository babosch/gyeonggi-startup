'use client'

import { useState } from 'react'

interface Facility { id: string; name: string; unit: string; price: number }

export default function FacilityManager({ initial }: { initial: Facility[] }) {
  const [facilities, setFacilities] = useState<Facility[]>(initial)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('회')
  const [price, setPrice] = useState(2000)
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!name.trim() || price < 0) return
    setBusy(true)
    const res = await fetch('/api/admin/facility', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), unit: unit.trim() || '회', price }),
    })
    const d = await res.json()
    setBusy(false)
    if (res.ok && d.facility) {
      setFacilities([...facilities, d.facility])
      setName(''); setPrice(2000)
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  async function remove(id: string) {
    if (!confirm('이 시설을 삭제할까요? 관련 신청 기록도 함께 사라져요.')) return
    setBusy(true)
    const res = await fetch('/api/admin/facility', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setBusy(false)
    if (res.ok) setFacilities(facilities.filter(f => f.id !== id))
    else { const d = await res.json().catch(() => ({})); alert(`오류: ${d.error}`) }
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm mb-6">
      <div className="font-bold text-gray-800 mb-1">🏪 시설 등록·관리 <span className="text-sm text-gray-400">({facilities.length}/30)</span></div>
      <p className="text-xs text-gray-400 mb-3">공무원과 같은 시설 목록이에요. 여기서 등록·삭제하면 회사들이 신청할 수 있어요.</p>

      <div className="flex flex-col gap-2 mb-4">
        {facilities.length === 0 && <p className="text-sm text-gray-400">아직 등록된 시설이 없어요.</p>}
        {facilities.map(f => (
          <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
            <span className="font-medium text-gray-700">{f.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{f.price.toLocaleString()}원/{f.unit}</span>
              <button onClick={() => remove(f.id)} disabled={busy} className="text-red-400 disabled:opacity-40">✕</button>
            </div>
          </div>
        ))}
      </div>

      {facilities.length < 30 && (
        <div className="flex gap-2 border-t border-gray-100 pt-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="시설 이름" maxLength={40}
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="단위" maxLength={4}
            className="w-14 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center" />
          <input type="number" value={price} min={0} onChange={e => setPrice(+e.target.value)}
            className="w-20 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center" />
          <button onClick={add} disabled={busy || !name.trim()}
            className="bg-blue-500 text-white rounded-xl px-3 font-bold text-sm disabled:opacity-40">추가</button>
        </div>
      )}
    </div>
  )
}
