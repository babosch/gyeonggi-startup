'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

const ICONS = ['🏭', '🍪', '✏️', '🎨', '🧸', '👕', '📚', '🌸', '⚽', '🎵']

interface Company { id: string; display_name: string; icon: string; balance: number }
interface Product { id: string; name: string; stock: number; sold: number; price: number }
interface Stats {
  balance: number; grantTotal: number; materialCost: number; revenue: number; profit: number
}

export default function CompanyManager({ stage, company, products: initial, stats, notCeo }: {
  stage: Stage; company: Company | null; products: Product[]; stats: Stats | null; notCeo?: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  const [icon, setIcon] = useState(company?.icon ?? '🏭')
  const [name, setName] = useState(company?.display_name ?? '')
  const [products, setProducts] = useState<Product[]>(initial)
  const [newName, setNewName] = useState('')
  const [newStock, setNewStock] = useState(10)
  const [newPrice, setNewPrice] = useState(3000)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  if (notCeo) return (
    <PageShell title="회사 관리" emoji="🏭">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 사용할 수 있어요.</div>
    </PageShell>
  )

  async function saveCompany() {
    setSaving(true)
    await supabase.from('companies').update({ icon, display_name: name }).eq('id', company!.id)
    setSaving(false)
    setSavedMsg('회사 정보를 저장했어요!')
    setTimeout(() => setSavedMsg(''), 2000)
    router.refresh()
  }

  async function addProduct() {
    if (!newName || newPrice < 1 || products.length >= 8) return
    const { data } = await supabase.from('products')
      .insert({ company_id: company!.id, name: newName, stock: newStock, price: newPrice })
      .select().single()
    if (data) {
      setProducts([...products, data as Product])
      setNewName(''); setNewStock(10); setNewPrice(3000)
    }
  }

  async function updateProduct(id: string, patch: Partial<Product>) {
    await supabase.from('products').update(patch).eq('id', id)
    setProducts(products.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  async function removeProduct(id: string) {
    await supabase.from('products').delete().eq('id', id)
    setProducts(products.filter(p => p.id !== id))
  }

  return (
    <PageShell title="회사 관리" emoji="🏭">
      <div className="flex flex-col gap-4">
        {/* §5 운영 현황 대시보드 */}
        {stats && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">📊 우리 회사 운영 현황</div>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="현재 잔액" value={stats.balance} color="blue" />
              <StatBox label="총 지원금" value={stats.grantTotal} color="green" />
              <StatBox label="재료비 지출" value={stats.materialCost} color="amber" negative />
              <StatBox label="총 매출" value={stats.revenue} color="purple" />
            </div>
            <div className={`mt-3 rounded-2xl p-4 text-center border-2
              ${stats.profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-xs font-medium text-gray-500 mb-1">이익 (매출 - 재료비)</div>
              <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString()}원
              </div>
            </div>
          </div>
        )}
        {/* 회사 기본 정보 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">회사 정보</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`text-2xl w-12 h-12 rounded-2xl transition-all ${icon === ic ? 'bg-blue-100 scale-110' : 'bg-gray-50'}`}>
                {ic}
              </button>
            ))}
          </div>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="회사 이름"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-lg font-medium focus:border-blue-400 outline-none" />
          <button onClick={saveCompany} disabled={saving || !name}
            className="w-full mt-3 bg-blue-500 text-white rounded-xl py-3 font-bold disabled:opacity-40">
            {saving ? '...' : '회사 정보 저장'}
          </button>
          {savedMsg && <p className="text-center text-green-600 text-sm mt-2">{savedMsg}</p>}
        </div>

        {/* 상품 목록 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">우리 상품 <span className="text-sm text-gray-400">({products.length}/8)</span></div>
          <p className="text-xs text-gray-400 mb-3">판매 단계에서 팔 상품을 등록해요</p>

          <div className="flex flex-col gap-2 mb-4">
            {products.map(p => (
              <div key={p.id} className="flex gap-2 items-center bg-gray-50 rounded-xl p-2">
                <input value={p.name} onChange={e => updateProduct(p.id, { name: e.target.value })}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">재고</span>
                  <input type="number" value={p.stock} min={0} onChange={e => updateProduct(p.id, { stock: +e.target.value })}
                    className="w-14 bg-white border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center" />
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" value={p.price} min={1} onChange={e => updateProduct(p.id, { price: +e.target.value })}
                    className="w-20 bg-white border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center" />
                  <span className="text-xs text-gray-400">원</span>
                </div>
                <button onClick={() => removeProduct(p.id)} className="text-red-400 px-1">✕</button>
              </div>
            ))}
          </div>

          {products.length < 8 && (
            <div className="flex gap-2 items-center border-t border-gray-100 pt-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="새 상품" maxLength={15}
                className="flex-1 border-2 border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-blue-400 outline-none" />
              <input type="number" value={newStock} min={0} onChange={e => setNewStock(+e.target.value)}
                className="w-14 border-2 border-gray-200 rounded-lg px-1 py-2 text-sm text-center" />
              <input type="number" value={newPrice} min={1} onChange={e => setNewPrice(+e.target.value)}
                className="w-20 border-2 border-gray-200 rounded-lg px-1 py-2 text-sm text-center" />
              <button onClick={addProduct} disabled={!newName}
                className="bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40">추가</button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function StatBox({ label, value, color, negative }: {
  label: string; value: number; color: string; negative?: boolean
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className={`rounded-2xl p-3 text-center ${colors[color] ?? 'bg-gray-50 text-gray-600'}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold">
        {negative && value > 0 ? '-' : ''}{value.toLocaleString()}원
      </div>
    </div>
  )
}
