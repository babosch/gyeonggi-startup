'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import type { Stage } from '@/lib/types'

interface Company { id: string; display_name: string; icon: string }
interface Exchange { give: string | null; want: string | null; thanks: string | null }

export default function ExchangeView({ stage, fairMode, role, hasCompany, others, exchanges }: {
  stage: Stage; fairMode: boolean; role: string; hasCompany: boolean
  others: Company[]; exchanges: Exchange[]
}) {
  const router = useRouter()
  const [toCompany, setToCompany] = useState('')
  const [give, setGive] = useState('')
  const [want, setWant] = useState('')
  const [thanks, setThanks] = useState('')
  const [busy, setBusy] = useState(false)
  const [showConcept, setShowConcept] = useState(false)
  const first = exchanges.length === 0

  if (role !== 'ceo' && role !== 'officer') {
    return <PageShell title="교류" emoji="🤝">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO와 공무원이 교류를 기록해요.</div>
    </PageShell>
  }
  if (stage < 3) return <PageShell title="교류" emoji="🤝" locked={{ opensAt: '교류' }}>{null}</PageShell>

  async function submit() {
    setBusy(true)
    const res = await fetch('/api/exchange', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toCompany, give, want, thanks }),
    })
    setBusy(false)
    if (res.ok) {
      if (first) setShowConcept(true)
      else { setGive(''); setWant(''); setThanks(''); setToCompany(''); router.refresh() }
    }
  }

  return (
    <PageShell title="교류의 장" emoji="🤝">
      <div className="flex flex-col gap-4">
        {fairMode && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center text-purple-700 font-medium">
            🎪 박람회가 열렸어요! 여러 도시가 모여 협력해요
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div className="font-bold text-gray-800">협력 기록하기</div>
          <p className="text-xs text-gray-400 -mt-2">돈이 아니라 재료·기술·도움을 주고받아요</p>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">🏢 어느 회사와?</label>
            <select value={toCompany} onChange={e => setToCompany(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none">
              <option value="">회사를 골라요</option>
              {others.map(c => <option key={c.id} value={c.id}>{c.icon} {c.display_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">🎁 우리가 제공한 것</label>
            <input value={give} onChange={e => setGive(e.target.value)} maxLength={50}
              placeholder="예: 색종이 20장" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">🙏 우리가 받은 것</label>
            <input value={want} onChange={e => setWant(e.target.value)} maxLength={50}
              placeholder="예: 풀 5개" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">💌 감사 한마디 (선택)</label>
            <input value={thanks} onChange={e => setThanks(e.target.value)} maxLength={50}
              placeholder="고마운 마음을 적어요" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
          </div>

          <button onClick={submit} disabled={busy || !toCompany || (!give && !want)}
            className="bg-purple-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
            {busy ? '기록 중...' : '협력 기록하기'}
          </button>
        </div>

        {exchanges.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">우리 반 협력 기록</div>
            {exchanges.map((e, i) => (
              <div key={i} className="text-sm border-b border-gray-100 py-2 last:border-0">
                <span className="text-purple-600">🎁 {e.give ?? '-'}</span>
                <span className="text-gray-400 mx-2">↔</span>
                <span className="text-green-600">🙏 {e.want ?? '-'}</span>
                {e.thanks && <span className="text-gray-400 ml-2">💌 {e.thanks}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showConcept && (
        <ConceptPopup kind="formative_exchange" stage={3}
          prompt="우리 지역에 없는 것을 다른 지역과 주고받는 것을 무엇이라 할까요?"
          options={['교류', '생산', '저축']} correct="교류"
          explanation="지역마다 가진 것이 달라서 서로 주고받아요. 이렇게 도움을 주고받는 것을 교류, 서로 의지하는 것을 상호의존이라고 해요."
          onClose={() => { setShowConcept(false); router.push('/home') }} />
      )}
    </PageShell>
  )
}
