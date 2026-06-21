'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

interface SalesItem { name: string; qty: number; price: number }
interface Company {
  id: string
  display_name: string
  plan: {
    salesItems?: SalesItem[]
    whatToSell?: string
    target?: string
    reason?: string
  } | null
}
interface MyApp { id: string; company_id: string; motivation: string; status: string }

export default function ApplyView({ companies, myApps }: {
  companies: Company[]
  myApps: MyApp[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [motivation, setMotivation] = useState('')
  const [busy, setBusy] = useState(false)

  const appMap = Object.fromEntries(myApps.map(a => [a.company_id, a]))
  const hired = myApps.find(a => a.status === 'hired')

  async function apply() {
    if (!selected || !motivation.trim()) return
    setBusy(true)
    const res = await fetch('/api/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: selected, motivation: motivation.trim() }),
    })
    setBusy(false)
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json()
      if (d.error === 'already_hired') alert('이미 채용됐어요!')
      else alert(`오류: ${d.error}`)
    }
  }

  if (hired) {
    return (
      <PageShell title="취업 지원" emoji="💼">
        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <div className="text-xl font-bold text-green-700 mb-2">채용됐어요!</div>
          <div className="text-gray-600">홈으로 돌아가서 회사 업무를 시작해요.</div>
          <button onClick={() => router.push('/home')} className="mt-6 bg-green-500 text-white px-8 py-3 rounded-2xl font-bold">
            홈으로
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="취업 지원" emoji="💼">
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
          💡 일하고 싶은 회사를 골라 지원 동기를 써서 지원해요. CEO가 검토 후 채용 여부를 결정해요.
        </div>

        {/* 불합격 후 재지원 안내 */}
        {myApps.some(a => a.status === 'rejected') && !hired && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-700 font-medium">
            🔄 불합격된 회사가 있어요. 다른 회사에 지원해 보세요!
          </div>
        )}

        {companies.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
            아직 선정된 회사가 없어요. 잠시 기다려요!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {companies.map(c => {
              const myApp = appMap[c.id]
              const isSelected = selected === c.id
              // 불합격된 회사는 클릭 불가, 대기중/채용된 회사도 클릭 불가, 미지원은 지원 가능
              const canApply = !myApp

              return (
                <div key={c.id}
                  onClick={() => canApply && setSelected(isSelected ? null : c.id)}
                  className={`bg-white rounded-3xl p-5 shadow-sm border-2 transition-all
                    ${isSelected ? 'border-blue-400 bg-blue-50 cursor-pointer'
                    : myApp?.status === 'rejected' ? 'border-gray-100 opacity-60 cursor-not-allowed'
                    : myApp ? 'border-gray-100 cursor-default'
                    : 'border-transparent hover:border-gray-200 cursor-pointer'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800 text-lg">{c.display_name}</span>
                    {myApp && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${myApp.status === 'hired' ? 'bg-green-100 text-green-700'
                        : myApp.status === 'rejected' ? 'bg-red-100 text-red-500'
                        : 'bg-yellow-100 text-yellow-700'}`}>
                        {myApp.status === 'hired' ? '채용됨' : myApp.status === 'rejected' ? '불합격' : '검토 중'}
                      </span>
                    )}
                  </div>

                  {c.plan && (
                    <div className="text-sm text-gray-600 space-y-1">
                      {c.plan.salesItems && c.plan.salesItems.length > 0 && (
                        <p>🛍 <b>판매 물건:</b> {c.plan.salesItems.map(it => it.name).join(', ')}</p>
                      )}
                      {!c.plan.salesItems && c.plan.whatToSell && (
                        <p>🛍 <b>판매 물건:</b> {c.plan.whatToSell}</p>
                      )}
                      {c.plan.target && <p>🙋 <b>판매 대상:</b> {c.plan.target}</p>}
                      {c.plan.reason && <p>💡 <b>우리 도시에 필요한 이유:</b> {c.plan.reason}</p>}
                    </div>
                  )}

                  {isSelected && !myApp && (
                    <div className="mt-4 border-t border-blue-200 pt-4" onClick={e => e.stopPropagation()}>
                      <label className="block text-sm font-medium text-blue-700 mb-1.5">
                        ✍️ 지원 동기 <span className="text-gray-400">(내가 어떻게 기여할 수 있는지 써요)</span>
                      </label>
                      <textarea value={motivation} onChange={e => setMotivation(e.target.value)}
                        placeholder="예: 저는 그림을 잘 그려서 포장 디자인을 예쁘게 할 수 있어요!"
                        rows={3} maxLength={120}
                        className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:border-blue-400 outline-none resize-none" />
                      <button onClick={apply} disabled={busy || !motivation.trim()}
                        className="mt-2 w-full bg-blue-500 text-white rounded-xl py-3 font-bold disabled:opacity-40">
                        {busy ? '제출 중...' : '지원하기'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}
