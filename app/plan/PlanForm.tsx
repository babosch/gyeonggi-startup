'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import { GRANT_AMOUNT } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface PlanItem { name: string; qty: number; price: number }
interface PlanContent {
  companyName: string
  whatToSell: string
  target: string
  useSpecialty: boolean
  specialtyDetail: string
  reason: string
  items: PlanItem[]
}

interface ExistingPlan {
  id: string
  content: PlanContent
  reserve_amount: number
  status: string
  version: number
}

export default function PlanForm({ role, cityName, stage, existing }: {
  role: string; cityName: string; stage: Stage; existing: ExistingPlan | null
}) {
  const router = useRouter()
  const selected = existing?.status === 'selected'
  // 보드로 열려 있는 동안 작성 가능 (선정되면 읽기전용, 수정본 1회 후 잠금)
  const canEdit = !selected && (existing?.version ?? 0) === 0

  const c = existing?.content
  const [companyName, setCompanyName] = useState(c?.companyName ?? '')
  const [whatToSell, setWhatToSell] = useState(c?.whatToSell ?? '')
  const [target, setTarget] = useState(c?.target ?? '')
  const [useSpecialty, setUseSpecialty] = useState(c?.useSpecialty ?? false)
  const [specialtyDetail, setSpecialtyDetail] = useState(c?.specialtyDetail ?? '')
  const [reason, setReason] = useState(c?.reason ?? '')
  const [items, setItems] = useState<PlanItem[]>(c?.items ?? [{ name: '', qty: 1, price: 0 }])
  const [reserve, setReserve] = useState(existing?.reserve_amount ?? 20000)
  const [saving, setSaving] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  const itemTotal = items.reduce((s, it) => s + it.qty * it.price, 0)
  const plannedSpend = GRANT_AMOUNT - reserve

  function updateItem(i: number, patch: Partial<PlanItem>) {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItem() { if (items.length < 8) setItems([...items, { name: '', qty: 1, price: 0 }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }

  async function submit() {
    setSaving(true)
    const content: PlanContent = { companyName, whatToSell, target, useSpecialty, specialtyDetail, reason, items }
    const res = await fetch('/api/plan/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, reserve, planId: existing?.id, version: existing?.version ?? 0 }),
    })
    setSaving(false)
    if (res.ok) {
      if (!existing) setShowConcept(true)
      else router.push('/home')
    }
  }

  if (role !== 'applicant' && role !== 'ceo') {
    return (
      <PageShell title="사업계획서" emoji="📝">
        <div className="bg-white rounded-3xl p-8 text-center text-gray-500">
          이 기능은 지원자·CEO만 사용할 수 있어요.
        </div>
      </PageShell>
    )
  }


  return (
    <PageShell title="사업계획서" emoji="📝">
      <div className="flex flex-col gap-4">
        {selected && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-green-700 font-medium text-center">
            🎉 선정된 계획서예요! 이제 CEO로 회사를 운영해요.
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <Field label="🏢 회사 이름" value={companyName} onChange={setCompanyName} disabled={!canEdit} max={20} />
          <Field label="🎨 무엇을 만들거나 팔까요?" value={whatToSell} onChange={setWhatToSell} disabled={!canEdit} max={40} />
          <Field label="🙋 누구에게 팔까요?" value={target} onChange={setTarget} disabled={!canEdit} max={40} placeholder="예: 같은 반 친구들" />

          <div className={`rounded-2xl p-4 border-2 ${useSpecialty ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={useSpecialty} disabled={!canEdit}
                onChange={e => setUseSpecialty(e.target.checked)} className="w-5 h-5" />
              <span className="font-medium text-gray-700">⭐ 우리 도시({cityName}) 특산품을 활용해요 <span className="text-amber-600 text-sm">(보너스!)</span></span>
            </label>
            {useSpecialty && (
              <input value={specialtyDetail} onChange={e => setSpecialtyDetail(e.target.value)} disabled={!canEdit}
                placeholder="어떻게 활용하나요?" maxLength={40}
                className="w-full mt-3 border-2 border-amber-200 rounded-xl px-4 py-2.5 text-gray-800 focus:border-amber-400 outline-none disabled:bg-gray-50" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">💪 우리를 뽑아야 하는 이유</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit} rows={2} maxLength={120}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none resize-none disabled:bg-gray-50" />
          </div>
        </div>

        {/* 품목표 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">🧾 사고 싶은 물건</div>
          <p className="text-xs text-gray-400 mb-3">지원금 {GRANT_AMOUNT.toLocaleString()}원으로 무엇을 살까요?</p>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={it.name} onChange={e => updateItem(i, { name: e.target.value })} disabled={!canEdit}
                  placeholder="물건" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <input type="number" value={it.qty || ''} onChange={e => updateItem(i, { qty: +e.target.value })} disabled={!canEdit}
                  placeholder="개" min={1} className="w-14 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <input type="number" value={it.price || ''} onChange={e => updateItem(i, { price: +e.target.value })} disabled={!canEdit}
                  placeholder="원" min={0} className="w-20 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <span className="w-16 text-right text-sm text-gray-500">{(it.qty * it.price).toLocaleString()}</span>
                {canEdit && items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-red-400 px-1">✕</button>
                )}
              </div>
            ))}
          </div>
          {canEdit && items.length < 8 && (
            <button onClick={addItem} className="mt-3 text-blue-500 text-sm font-medium">+ 물건 추가</button>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between font-bold text-gray-800">
            <span>합계</span><span>{itemTotal.toLocaleString()}원</span>
          </div>
        </div>

        {/* 예비비 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">🐷 예비비 (남겨둘 돈)</div>
          <p className="text-xs text-gray-400 mb-4">갑자기 필요할 때를 대비해 남겨둬요</p>
          <input type="range" min={0} max={GRANT_AMOUNT} step={5000} value={reserve} disabled={!canEdit}
            onChange={e => setReserve(+e.target.value)} className="w-full" />
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-500">예비비 <b className="text-gray-800">{reserve.toLocaleString()}원</b></span>
            <span className="text-gray-500">쓸 수 있는 돈 <b className="text-blue-600">{plannedSpend.toLocaleString()}원</b></span>
          </div>
        </div>

        {canEdit ? (
          <button onClick={submit} disabled={saving || !companyName || !whatToSell || !reason}
            className="bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
            {saving ? '제출 중...' : existing ? '계획서 수정 제출' : '시장님께 제출하기'}
          </button>
        ) : (
          <p className="text-center text-gray-400 text-sm">
            {selected ? '선정 완료' : '제출했어요! 시장님의 선정을 기다려요'}
          </p>
        )}
      </div>

      {showConcept && (
        <ConceptPopup kind="formative_plan" stage={1}
          prompt="하고 싶은 건 많은데 돈이 부족해서 다 살 수 없는 상태를 무엇이라 할까요?"
          options={['희소성', '풍요', '낭비']} correct="희소성"
          explanation="자원(돈)은 한정되어 있어서 원하는 걸 다 가질 수 없어요. 이것을 희소성이라고 해요."
          onClose={() => { setShowConcept(false); router.push('/home') }} />
      )}
    </PageShell>
  )
}

function Field({ label, value, onChange, disabled, max, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; max: number; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} disabled={disabled} maxLength={max} placeholder={placeholder}
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base focus:border-blue-400 outline-none disabled:bg-gray-50 disabled:text-gray-500" />
    </div>
  )
}
