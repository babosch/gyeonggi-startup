'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import type { Stage } from '@/lib/types'

interface Item { name: string; qty: number; price: number }
interface Past { items: Item[]; dropped_items: { name: string; reason: string }[]; total: number; status: string }

export default function RequisitionForm({ stage, balance, past, notCeo }: {
  stage: Stage; balance: number; past: Past[]; notCeo?: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([{ name: '', qty: 1, price: 0 }])
  const [dropped, setDropped] = useState<{ name: string; reason: string }[]>([{ name: '', reason: '' }])
  const [saving, setSaving] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  if (notCeo) return (
    <PageShell title="품의서" emoji="🧾">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 사용할 수 있어요.</div>
    </PageShell>
  )

  const total = items.reduce((s, it) => s + it.qty * it.price, 0)
  const over = total > balance

  function up(i: number, patch: Partial<Item>) { setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it)) }
  function upDrop(i: number, patch: Partial<{ name: string; reason: string }>) {
    setDropped(dropped.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  }

  async function submit() {
    setSaving(true)
    const validItems = items.filter(it => it.name && it.qty > 0 && it.price > 0)
    const validDropped = dropped.filter(d => d.name)
    const res = await fetch('/api/requisition', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validItems, dropped: validDropped, total }),
    })
    setSaving(false)
    if (res.ok) setShowConcept(true)
    else { const d = await res.json(); alert(d.error === 'over_balance' ? '잔액이 부족해요!' : `오류: ${d.error}`) }
  }

  return (
    <PageShell title="품의서" emoji="🧾">
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <span className="text-sm text-blue-600">회사 잔액</span>
          <div className="text-2xl font-bold text-blue-700">{balance.toLocaleString()}원</div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">🛒 사고 싶은 물건</div>
          <p className="text-xs text-gray-400 mb-3">무엇을, 몇 개, 얼마에 살까요?</p>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={it.name} onChange={e => up(i, { name: e.target.value })} placeholder="물건"
                  className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
                <input type="number" value={it.qty || ''} onChange={e => up(i, { qty: +e.target.value })} min={1} placeholder="개"
                  className="w-14 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none" />
                <input type="number" value={it.price || ''} onChange={e => up(i, { price: +e.target.value })} min={0} placeholder="원"
                  className="w-20 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none" />
                <span className="w-16 text-right text-sm text-gray-500">{(it.qty * it.price).toLocaleString()}</span>
              </div>
            ))}
          </div>
          {items.length < 8 && (
            <button onClick={() => setItems([...items, { name: '', qty: 1, price: 0 }])}
              className="mt-3 text-blue-500 text-sm font-medium">+ 물건 추가</button>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between font-bold">
            <span className="text-gray-800">합계</span>
            <span className={over ? 'text-red-500' : 'text-gray-800'}>{total.toLocaleString()}원</span>
          </div>
          {over && <p className="text-red-500 text-sm mt-1">잔액보다 많아요!</p>}
        </div>

        {/* 기회비용 */}
        <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-100">
          <div className="font-bold text-amber-800 mb-1">🤔 사고 싶었지만 포기한 것</div>
          <p className="text-xs text-amber-600 mb-3">돈이 부족해 포기한 것과 이유를 적어요 (기회비용)</p>
          <div className="flex flex-col gap-2">
            {dropped.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input value={d.name} onChange={e => upDrop(i, { name: e.target.value })} placeholder="포기한 물건"
                  className="flex-1 border-2 border-amber-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none" />
                <input value={d.reason} onChange={e => upDrop(i, { reason: e.target.value })} placeholder="왜 포기했나요?"
                  className="flex-1 border-2 border-amber-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none" />
              </div>
            ))}
          </div>
          {dropped.length < 5 && (
            <button onClick={() => setDropped([...dropped, { name: '', reason: '' }])}
              className="mt-3 text-amber-600 text-sm font-medium">+ 추가</button>
          )}
        </div>

        <button onClick={submit} disabled={saving || over || total === 0}
          className="bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
          {saving ? '제출 중...' : '시장님께 품의서 제출'}
        </button>

        {past.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">지난 품의서</div>
            {past.map((p, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-gray-100 py-2 last:border-0">
                <span className="text-gray-600">{p.items.map(it => it.name).join(', ')}</span>
                <span className={`font-medium ${p.status === 'approved' ? 'text-green-600' : p.status === 'rejected' ? 'text-red-500' : 'text-gray-400'}`}>
                  {p.total.toLocaleString()}원 · {p.status === 'approved' ? '승인' : p.status === 'rejected' ? '반려' : '대기'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConcept && (
        <ConceptPopup kind="formative_requisition" stage={1}
          prompt="여러 가지 중에서 하나를 고르면 나머지는 포기해야 해요. 포기한 것을 무엇이라 할까요?"
          options={['기회비용', '이익', '저축']} correct="기회비용"
          explanation="무언가를 선택하면 다른 걸 포기하게 돼요. 그 포기한 것의 가치를 기회비용이라고 해요."
          onClose={() => { setShowConcept(false); router.push('/home') }} />
      )}
    </PageShell>
  )
}
