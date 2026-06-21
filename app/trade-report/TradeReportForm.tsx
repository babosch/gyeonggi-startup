'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

interface Company { id: string; display_name: string; icon: string }
interface Report {
  id: string; item_name: string; detail: string; status: string
  company_id: string | null; created_at: string
}

export default function TradeReportForm({ companies, myReports }: {
  companies: Company[]; myReports: Report[]
}) {
  const router = useRouter()
  const [companyId, setCompanyId] = useState('')
  const [itemName, setItemName] = useState('')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function submit() {
    if (!itemName.trim() || !detail.trim()) return
    setBusy(true)
    const res = await fetch('/api/trade-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: companyId || null, itemName, detail }),
    })
    setBusy(false)
    if (res.ok) {
      setSubmitted(true)
      setTimeout(() => { setSubmitted(false); setItemName(''); setDetail(''); setCompanyId(''); router.refresh() }, 1500)
    }
  }

  return (
    <PageShell title="이상 거래 보고" emoji="🚨">
      <div className="flex flex-col gap-4">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          💡 시장에서 이상한 거래를 발견했나요? 어느 회사의 어떤 물건이 이상한지 시장님께 보고해요.
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">🏭 어느 회사인가요?</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none bg-white">
              <option value="">-- 회사 선택 (선택사항) --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.display_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">🏷️ 어떤 물건인가요?</label>
            <input value={itemName} onChange={e => setItemName(e.target.value)}
              placeholder="물건 이름을 적어요" maxLength={30}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              ❓ 어떤 점이 이상한가요?
              <span className="text-gray-400 font-normal"> (가격이 너무 높거나 낮음, 거래 방식이 이상함 등)</span>
            </label>
            <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} maxLength={200}
              placeholder="이상하다고 느낀 점을 자세히 적어요"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none resize-none" />
          </div>

          <button onClick={submit} disabled={busy || !itemName.trim() || !detail.trim()}
            className="bg-red-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
            {submitted ? '✅ 보고 완료!' : busy ? '제출 중...' : '시장님께 보고하기 🚨'}
          </button>
        </div>

        {myReports.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">내가 보고한 목록</div>
            <div className="flex flex-col gap-2">
              {myReports.map(r => (
                <div key={r.id} className="flex justify-between items-start border-b border-gray-100 py-2 last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{r.item_name}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{r.detail.slice(0, 40)}{r.detail.length > 40 ? '…' : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 shrink-0
                    ${r.status === 'resolved' ? 'bg-green-100 text-green-700'
                    : r.status === 'reviewed' ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'}`}>
                    {r.status === 'resolved' ? '처리됨' : r.status === 'reviewed' ? '확인됨' : '접수됨'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
