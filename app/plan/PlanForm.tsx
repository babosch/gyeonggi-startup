'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import FeedbackBanner from '@/components/FeedbackBanner'
import { GRANT_AMOUNT } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface ProductDef { name: string; materials: string; method: string }
interface PlanItem { name: string; qty: number; price: number }
interface PlanContent {
  companyName: string
  products: ProductDef[]
  target: string
  useSpecialty: boolean
  specialtyDetail: string
  reason: string
  items: PlanItem[]
}

interface ExistingPlan {
  id: string
  content: PlanContent & { whatToSell?: string }
  reserve_amount: number
  status: string
  version: number
  feedback?: string | null
}

const DEFAULT_PRODUCT: ProductDef = { name: '', materials: '', method: '' }

export default function PlanForm({ role, cityName, stage, existing }: {
  role: string; cityName: string; stage: Stage; existing: ExistingPlan | null
}) {
  const router = useRouter()
  const selected = existing?.status === 'selected'
  const canEdit = !selected && (existing?.version ?? 0) === 0

  const c = existing?.content

  // 이전 데이터 호환 (whatToSell 문자열 → products 배열)
  const initProducts: ProductDef[] = c?.products?.length
    ? c.products
    : c?.whatToSell
      ? [{ name: c.whatToSell, materials: '', method: '' }]
      : [{ ...DEFAULT_PRODUCT }]

  const [companyName, setCompanyName]     = useState(c?.companyName ?? '')
  const [products, setProducts]           = useState<ProductDef[]>(initProducts)
  const [target, setTarget]               = useState(c?.target ?? '')
  const [useSpecialty, setUseSpecialty]   = useState(c?.useSpecialty ?? false)
  const [specialtyDetail, setSpecialtyDetail] = useState(c?.specialtyDetail ?? '')
  const [reason, setReason]               = useState(c?.reason ?? '')
  const [items, setItems]                 = useState<PlanItem[]>(c?.items ?? [{ name: '', qty: 1, price: 0 }])
  const [reserve, setReserve]             = useState(existing?.reserve_amount ?? 20000)
  const [saving, setSaving]               = useState(false)
  const [showConcept, setShowConcept]     = useState(false)

  const itemTotal    = items.reduce((s, it) => s + it.qty * it.price, 0)
  const plannedSpend = GRANT_AMOUNT - reserve

  function updateProduct(i: number, patch: Partial<ProductDef>) {
    setProducts(products.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  }
  function addProduct() { if (products.length < 6) setProducts([...products, { ...DEFAULT_PRODUCT }]) }
  function removeProduct(i: number) { if (products.length > 1) setProducts(products.filter((_, idx) => idx !== i)) }

  function updateItem(i: number, patch: Partial<PlanItem>) {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItem() { if (items.length < 8) setItems([...items, { name: '', qty: 1, price: 0 }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }

  async function submit() {
    setSaving(true)
    const content: PlanContent = { companyName, products, target, useSpecialty, specialtyDetail, reason, items }
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
        <FeedbackBanner feedback={existing?.feedback} />

        {/* 기본 정보 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <Field label="🏢 회사 이름" value={companyName} onChange={setCompanyName} disabled={!canEdit} max={20} />
          <Field label="🙋 누구에게 팔까요?" value={target} onChange={setTarget} disabled={!canEdit} max={40} placeholder="예: 같은 반 친구들" />

          {/* 특산품 활용 */}
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
        </div>

        {/* 만들 물건 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">🎨 만들 물건</div>
          <p className="text-xs text-gray-400 mb-3">어떤 물건을 만들 건가요? 재료와 생산 방법도 적어보세요.</p>
          <div className="flex flex-col gap-4">
            {products.map((p, i) => (
              <div key={i} className="border-2 border-gray-100 rounded-2xl p-4 flex flex-col gap-2.5 relative">
                {canEdit && products.length > 1 && (
                  <button onClick={() => removeProduct(i)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-400 text-lg transition-colors">✕</button>
                )}
                <input value={p.name} onChange={e => updateProduct(i, { name: e.target.value })} disabled={!canEdit}
                  placeholder="물건 이름 (예: 도자기 머그컵)"
                  maxLength={30}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <input value={p.materials} onChange={e => updateProduct(i, { materials: e.target.value })} disabled={!canEdit}
                  placeholder="어떤 재료로 만드나요? (예: 흙, 유약)"
                  maxLength={40}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <input value={p.method} onChange={e => updateProduct(i, { method: e.target.value })} disabled={!canEdit}
                  placeholder="어떻게 생산하나요? (예: 손으로 빚어서 가마에 구움)"
                  maxLength={50}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none disabled:bg-gray-50" />
              </div>
            ))}
          </div>
          {canEdit && products.length < 6 && (
            <button onClick={addProduct} className="mt-3 text-blue-500 text-sm font-medium">+ 물건 추가</button>
          )}
        </div>

        {/* 물건 생산에 필요한 재료 구입 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">🧾 물건 생산에 필요한 재료</div>
          <p className="text-xs text-gray-400 mb-1">아이스크림몰에서 재료를 구입해요.</p>
          <p className="text-xs text-gray-400 mb-3">물건 이름은 아이스크림몰에 있는 것 그대로 입력하세요.</p>
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            <span className="col-span-5 text-xs text-gray-500 font-medium">물건 이름</span>
            <span className="col-span-3 text-xs text-gray-500 font-medium text-center">필요한 수량</span>
            <span className="col-span-3 text-xs text-gray-500 font-medium text-center">1개당 금액</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={it.name} onChange={e => updateItem(i, { name: e.target.value })} disabled={!canEdit}
                  placeholder="물건 이름" className="col-span-5 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <input type="number" value={it.qty || ''} onChange={e => updateItem(i, { qty: +e.target.value })} disabled={!canEdit}
                  placeholder="개" min={1} className="col-span-3 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none disabled:bg-gray-50" />
                <input type="number" value={it.price || ''} onChange={e => updateItem(i, { price: +e.target.value })} disabled={!canEdit}
                  placeholder="원" min={0} className="col-span-3 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none disabled:bg-gray-50" />
                {canEdit && items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="col-span-1 text-gray-300 hover:text-red-400 transition-colors">✕</button>
                )}
              </div>
            ))}
          </div>
          {canEdit && items.length < 8 && (
            <button onClick={addItem} className="mt-3 text-blue-500 text-sm font-medium">+ 재료 추가</button>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between font-bold text-gray-800">
            <span>합계</span><span>{itemTotal.toLocaleString()}원</span>
          </div>
        </div>

        {/* 이 도시에 필요한 이유 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-1.5">
            💡 우리 회사가 이 도시에 필요한 이유
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit} rows={3} maxLength={120}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none resize-none disabled:bg-gray-50" />
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
          <button onClick={submit} disabled={saving || !companyName || !products[0].name || !reason}
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
