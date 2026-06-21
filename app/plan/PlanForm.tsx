'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import FeedbackBanner from '@/components/FeedbackBanner'
import { GRANT_AMOUNT } from '@/lib/constants'
import type { Stage } from '@/lib/types'

// 판매 계획 항목
interface SalesItem { name: string; qty: number; price: number }

interface PlanContent {
  companyName: string
  salesItems: SalesItem[]    // 판매 물건 이름 / 판매 예상 갯수 / 판매 단가
  target: string
  useSpecialty: boolean
  specialtyDetail: string
  reason: string
  // 구 포맷 호환
  whatToSell?: string
  products?: { name: string; materials?: string; method?: string }[]
  items?: { name: string; qty: number; price: number }[]
}

interface ExistingPlan {
  id: string
  content: PlanContent
  reserve_amount: number
  status: string
  version: number
  feedback?: string | null
}

function migrateLegacy(c: PlanContent): SalesItem[] {
  if (c.salesItems?.length) return c.salesItems
  // 구 포맷(items = 재료 구입) → 판매 계획으로 변환 시도
  if (c.items?.length) {
    return c.items.map(it => ({ name: it.name, qty: it.qty, price: it.price }))
  }
  if (c.whatToSell) {
    return [{ name: c.whatToSell, qty: 1, price: 0 }]
  }
  return [{ name: '', qty: 0, price: 0 }]
}

export default function PlanForm({ role, cityName, stage, existing }: {
  role: string; cityName: string; stage: Stage; existing: ExistingPlan | null
}) {
  const router = useRouter()
  const selected = existing?.status === 'selected'
  const canEdit = !selected && (existing?.version ?? 0) === 0

  const c = existing?.content
  const initSales = c ? migrateLegacy(c) : [{ name: '', qty: 0, price: 0 }]

  const [companyName, setCompanyName]     = useState(c?.companyName ?? '')
  const [salesItems, setSalesItems]       = useState<SalesItem[]>(initSales)
  const [target, setTarget]               = useState(c?.target ?? '')
  const [useSpecialty, setUseSpecialty]   = useState(c?.useSpecialty ?? false)
  const [specialtyDetail, setSpecialtyDetail] = useState(c?.specialtyDetail ?? '')
  const [reason, setReason]               = useState(c?.reason ?? '')
  const [saving, setSaving]               = useState(false)
  const [showConcept, setShowConcept]     = useState(false)

  const expectedRevenue = salesItems.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0)

  function updateItem(i: number, patch: Partial<SalesItem>) {
    setSalesItems(salesItems.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItem() {
    if (salesItems.length < 6) setSalesItems([...salesItems, { name: '', qty: 0, price: 0 }])
  }
  function removeItem(i: number) {
    if (salesItems.length > 1) setSalesItems(salesItems.filter((_, idx) => idx !== i))
  }

  async function submit() {
    setSaving(true)
    const content: Omit<PlanContent, 'whatToSell' | 'products' | 'items'> = {
      companyName, salesItems, target, useSpecialty, specialtyDetail, reason,
    }
    const res = await fetch('/api/plan/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, reserve: 0, planId: existing?.id, version: existing?.version ?? 0 }),
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

          <div className={`rounded-2xl p-4 border-2 ${useSpecialty ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={useSpecialty} disabled={!canEdit}
                onChange={e => setUseSpecialty(e.target.checked)} className="w-5 h-5" />
              <span className="font-medium text-gray-700">
                ⭐ {cityName} 특산품을 활용해요 <span className="text-amber-600 text-sm">(보너스!)</span>
              </span>
            </label>
            {useSpecialty && (
              <input value={specialtyDetail} onChange={e => setSpecialtyDetail(e.target.value)} disabled={!canEdit}
                placeholder="어떻게 활용하나요?" maxLength={40}
                className="w-full mt-3 border-2 border-amber-200 rounded-xl px-4 py-2.5 text-gray-800 focus:border-amber-400 outline-none disabled:bg-gray-50" />
            )}
          </div>
        </div>

        {/* 판매 계획 (예상 매출) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">📊 판매 계획</div>
          <p className="text-xs text-gray-400 mb-3">
            어떤 물건을 몇 개, 얼마에 팔 건가요? 예상 매출을 계산해 봐요.
          </p>

          {/* 열 헤더 */}
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            <span className="col-span-5 text-xs font-medium text-gray-500">판매 물건 이름</span>
            <span className="col-span-3 text-xs font-medium text-gray-500 text-center">판매 예상 갯수</span>
            <span className="col-span-3 text-xs font-medium text-gray-500 text-center">판매 단가(원)</span>
          </div>

          <div className="flex flex-col gap-2">
            {salesItems.map((it, i) => {
              const sub = (it.qty || 0) * (it.price || 0)
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.name} onChange={e => updateItem(i, { name: e.target.value })}
                    disabled={!canEdit} placeholder="물건 이름" maxLength={20}
                    className="col-span-5 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none disabled:bg-gray-50" />
                  <input type="number" value={it.qty || ''} min={0} onChange={e => updateItem(i, { qty: +e.target.value })}
                    disabled={!canEdit} placeholder="개"
                    className="col-span-3 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none disabled:bg-gray-50" />
                  <input type="number" value={it.price || ''} min={0} onChange={e => updateItem(i, { price: +e.target.value })}
                    disabled={!canEdit} placeholder="원"
                    className="col-span-3 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm text-center focus:border-blue-400 outline-none disabled:bg-gray-50" />
                  {canEdit && salesItems.length > 1 && (
                    <button onClick={() => removeItem(i)} className="col-span-1 text-gray-300 hover:text-red-400 transition-colors text-lg">✕</button>
                  )}
                  {sub > 0 && (
                    <div className="col-span-12 text-right text-xs text-gray-400 pr-8">
                      {it.name && `예상 매출: ${sub.toLocaleString()}원`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {canEdit && salesItems.length < 6 && (
            <button onClick={addItem} className="mt-3 text-blue-500 text-sm font-medium">+ 물건 추가</button>
          )}

          <div className="mt-4 pt-3 border-t-2 border-blue-100 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700">총 예상 매출</span>
            <span className="text-xl font-bold text-blue-600">{expectedRevenue.toLocaleString()}원</span>
          </div>

          {expectedRevenue > 0 && (
            <div className={`mt-2 rounded-xl p-3 text-sm font-medium text-center
              ${expectedRevenue >= GRANT_AMOUNT ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {expectedRevenue >= GRANT_AMOUNT
                ? `🎉 투자금(${GRANT_AMOUNT.toLocaleString()}원)보다 많이 벌 수 있어요!`
                : `💡 투자금(${GRANT_AMOUNT.toLocaleString()}원)의 ${Math.round(expectedRevenue / GRANT_AMOUNT * 100)}%를 벌 계획이에요`}
            </div>
          )}
        </div>

        {/* 이 도시에 필요한 이유 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-600 mb-1.5">
            💡 우리 회사가 이 도시에 필요한 이유
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit} rows={3} maxLength={120}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none resize-none disabled:bg-gray-50" />
        </div>

        {canEdit ? (
          <button onClick={submit} disabled={saving || !companyName || !salesItems[0].name || !reason}
            className="bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
            {saving ? '제출 중...' : existing ? '계획서 수정 제출' : '시장님께 제출하기'}
          </button>
        ) : (
          <p className="text-center text-gray-400 text-sm">
            {selected ? '선정 완료 🎉' : '제출했어요! 시장님의 선정을 기다려요'}
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
  label: string; value: string; onChange: (v: string) => void
  disabled: boolean; max: number; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        maxLength={max} placeholder={placeholder}
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base
          focus:border-blue-400 outline-none disabled:bg-gray-50 disabled:text-gray-500" />
    </div>
  )
}
