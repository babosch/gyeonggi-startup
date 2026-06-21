'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import type { Stage } from '@/lib/types'

interface Company { id: string; display_name: string; icon: string }
interface Card { company_id: string; offer: string; want: string; updated_at: string }
interface Match { id: string; company_a: string; company_b: string; created_at: string }

export default function ExchangeView({ stage, fairMode, role, myCompanyId,
  companies, cards, matches, matchCountMap, myCard: initMyCard }: {
  stage: Stage; fairMode: boolean; role: string; myCompanyId: string | null
  companies: Company[]; cards: Card[]; matches: Match[]
  matchCountMap: Record<string, number>; myCard: Card | null
}) {
  const router = useRouter()

  // ── CEO: 카드 등록 ──────────────────────────────────────────
  const [offer, setOffer] = useState(initMyCard?.offer ?? '')
  const [want, setWant] = useState(initMyCard?.want ?? '')
  const [myCard, setMyCard] = useState<Card | null>(initMyCard)
  const [cardBusy, setCardBusy] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  // ── Officer: 매칭 ───────────────────────────────────────────
  const [selA, setSelA] = useState<string | null>(null)
  const [selB, setSelB] = useState<string | null>(null)
  const [matchBusy, setMatchBusy] = useState(false)
  const [matchedPairs, setMatchedPairs] = useState<Match[]>(matches)
  const [countMap, setCountMap] = useState(matchCountMap)

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))

  async function saveCard() {
    if (!offer.trim() || !want.trim()) return
    setCardBusy(true)
    const res = await fetch('/api/exchange-card', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer: offer.trim(), want: want.trim() }),
    })
    setCardBusy(false)
    if (res.ok) {
      const updated: Card = { company_id: myCompanyId!, offer: offer.trim(), want: want.trim(), updated_at: new Date().toISOString() }
      setMyCard(updated)
      if (!initMyCard) setShowConcept(true)
    } else {
      alert('저장 실패')
    }
  }

  async function createMatch() {
    if (!selA || !selB) return
    setMatchBusy(true)
    const res = await fetch('/api/exchange-match', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyAId: selA, companyBId: selB }),
    })
    setMatchBusy(false)
    if (res.ok) {
      const [a, b] = [selA, selB].sort()
      const newMatch: Match = { id: Date.now().toString(), company_a: a, company_b: b, created_at: new Date().toISOString() }
      setMatchedPairs(prev => [newMatch, ...prev])
      setCountMap(prev => ({ ...prev, [selA]: (prev[selA] ?? 0) + 1, [selB]: (prev[selB] ?? 0) + 1 }))
      setSelA(null); setSelB(null)
    } else {
      const d = await res.json()
      if (d.error === 'already_matched') alert('이미 매칭된 두 회사예요!')
      else alert(`오류: ${d.error}`)
    }
  }

  function selectCard(companyId: string) {
    if (!selA) { setSelA(companyId); return }
    if (selA === companyId) { setSelA(null); return }
    setSelB(companyId)
  }

  if (role !== 'ceo' && role !== 'officer' && role !== 'mayor') {
    return (
      <PageShell title="교류의 장" emoji="🤝">
        <div className="bg-white rounded-3xl p-10 text-center text-gray-500">
          <div className="text-4xl mb-4">🤝</div>
          CEO와 공무원이 교류를 진행해요.
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="교류의 장" emoji="🤝">
      <div className="flex flex-col gap-4">
        {fairMode && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl px-4 py-3 text-purple-700 font-medium text-center">
            🎪 박람회가 열렸어요! 다른 회사와 교류를 시작해요
          </div>
        )}

        {/* ── CEO: 내 교류 카드 등록 ── */}
        {role === 'ceo' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div>
              <div className="font-bold text-gray-800 text-lg mb-1">📋 교류 요청 카드 등록</div>
              <p className="text-xs text-gray-400">공무원이 이 카드를 보고 다른 회사와 연결해줘요</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">🎁 우리가 줄 수 있는 것</label>
              <input value={offer} onChange={e => setOffer(e.target.value)} maxLength={100}
                placeholder="예: 색종이 20장, 풀 5개, 포장 도움"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">🙏 우리가 원하는 것</label>
              <input value={want} onChange={e => setWant(e.target.value)} maxLength={100}
                placeholder="예: 가위 3개, 테이프, 홍보 도움"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
            </div>

            <button onClick={saveCard} disabled={cardBusy || !offer.trim() || !want.trim()}
              className="bg-purple-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
              {cardBusy ? '등록 중...' : myCard ? '✓ 카드 수정하기' : '카드 등록하기'}
            </button>

            {myCard && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
                <div className="text-xs text-purple-500 font-medium mb-2">📌 현재 등록된 카드</div>
                <div className="text-sm space-y-1">
                  <p><span className="text-purple-600 font-medium">줄 수 있는 것:</span> {myCard.offer}</p>
                  <p><span className="text-green-600 font-medium">원하는 것:</span> {myCard.want}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-400">교류 성사</span>
                  <span className={`text-lg font-bold ${(countMap[myCompanyId!] ?? 0) >= 2 ? 'text-yellow-500' : 'text-gray-600'}`}>
                    {countMap[myCompanyId!] ?? 0}건
                    {(countMap[myCompanyId!] ?? 0) >= 2 && ' 🏆'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 공무원/시장: 카드 목록 + 매칭 ── */}
        {(role === 'officer' || role === 'mayor') && (
          <>
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium border-2
              ${selA && selB ? 'bg-green-50 border-green-300 text-green-700'
                : selA ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              {selA && selB
                ? `✅ ${companyMap[selA]?.display_name} ↔ ${companyMap[selB]?.display_name} — 아래 버튼으로 매칭`
                : selA
                  ? `📌 ${companyMap[selA]?.display_name} 선택됨 — 연결할 두 번째 회사를 눌러요`
                  : '📋 두 회사 카드를 차례로 눌러 교류를 연결하세요'}
            </div>

            {cards.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                아직 교류 카드를 등록한 회사가 없어요.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cards.map(card => {
                  const co = companyMap[card.company_id]
                  if (!co) return null
                  const count = countMap[card.company_id] ?? 0
                  const isA = selA === card.company_id
                  const isB = selB === card.company_id

                  return (
                    <button key={card.company_id} onClick={() => selectCard(card.company_id)}
                      className={`w-full text-left bg-white rounded-3xl p-5 shadow-sm border-2 transition-all active:scale-[0.99]
                        ${isA ? 'border-blue-400 bg-blue-50'
                          : isB ? 'border-green-400 bg-green-50'
                          : 'border-transparent hover:border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{co.icon}</span>
                          <span className="font-bold text-gray-800">{co.display_name}</span>
                          {count >= 2 && <span className="text-yellow-500 text-lg" title="우수 교류 기업">🏆</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {count > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                              교류 {count}건
                            </span>
                          )}
                          {(isA || isB) && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold
                              ${isA ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                              {isA ? '① 선택' : '② 선택'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-purple-500 shrink-0">🎁 줄 수 있어요:</span>
                          <span className="text-gray-700">{card.offer}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 shrink-0">🙏 원해요:</span>
                          <span className="text-gray-700">{card.want}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selA && selB && (
              <div className="sticky bottom-4 flex gap-2">
                <button onClick={createMatch} disabled={matchBusy}
                  className="flex-1 bg-green-500 text-white rounded-2xl py-4 font-bold text-lg shadow-lg disabled:opacity-50 active:scale-95 transition-transform">
                  {matchBusy ? '매칭 중...' : '🤝 교류 매칭 성사!'}
                </button>
                <button onClick={() => { setSelA(null); setSelB(null) }}
                  className="px-5 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-medium">
                  취소
                </button>
              </div>
            )}

            {matchedPairs.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="font-bold text-gray-800 mb-3">✅ 성사된 교류 ({matchedPairs.length}건)</div>
                <div className="flex flex-col gap-2">
                  {matchedPairs.map(m => {
                    const coA = companyMap[m.company_a]
                    const coB = companyMap[m.company_b]
                    return (
                      <div key={m.id} className="flex items-center gap-2 text-sm text-gray-700 bg-purple-50 rounded-xl px-4 py-2.5">
                        <span>{coA?.icon} {coA?.display_name}</span>
                        <span className="text-purple-400 font-bold">↔</span>
                        <span>{coB?.icon} {coB?.display_name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* CEO도 다른 회사 카드 참고 가능 */}
        {role === 'ceo' && cards.filter(c => c.company_id !== myCompanyId).length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">🏢 다른 회사 카드 (참고용)</div>
            <div className="flex flex-col gap-3">
              {cards.filter(c => c.company_id !== myCompanyId).map(card => {
                const co = companyMap[card.company_id]
                if (!co) return null
                return (
                  <div key={card.company_id} className="bg-gray-50 rounded-2xl p-4">
                    <div className="font-medium text-gray-800 mb-2">{co.icon} {co.display_name}</div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-purple-500">🎁 줄 수 있어요:</span> {card.offer}</p>
                      <p><span className="text-green-500">🙏 원해요:</span> {card.want}</p>
                    </div>
                  </div>
                )
              })}
            </div>
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
