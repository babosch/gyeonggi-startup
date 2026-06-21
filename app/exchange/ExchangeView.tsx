'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import type { Stage } from '@/lib/types'

interface OwnCompany { id: string; display_name: string; icon: string }
interface OwnCard { company_id: string; offer: string; want: string; updated_at: string }
interface CrossCard {
  company_id: string; company_name: string; icon: string;
  city_name: string; class_id: string; offer: string; want: string;
}
interface ExchangeLog {
  id: string; from_company_id: string; to_city_name: string; to_company_name: string;
  give_text: string; received_text: string; notes: string | null; created_at: string;
}

export default function ExchangeView({
  stage, fairMode, role, myCompanyId, myCityName, classId,
  ownCompanies, ownCards, crossCards, exchangeLogs, myCard: initMyCard,
}: {
  stage: Stage; fairMode: boolean; role: string; myCompanyId: string | null
  myCityName: string; classId: string
  ownCompanies: OwnCompany[]; ownCards: OwnCard[]; crossCards: CrossCard[]
  exchangeLogs: ExchangeLog[]; myCard: OwnCard | null
}) {
  const router = useRouter()
  const ownCompanyMap = Object.fromEntries(ownCompanies.map(c => [c.id, c]))

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
        {role === 'ceo' && (
          <CeoView
            myCompanyId={myCompanyId!}
            initMyCard={initMyCard}
            ownCards={ownCards}
            ownCompanyMap={ownCompanyMap}
          />
        )}

        {(role === 'officer' || role === 'mayor') && (
          <OfficerView
            fairMode={fairMode}
            myCityName={myCityName}
            ownCompanies={ownCompanies}
            ownCards={ownCards}
            ownCompanyMap={ownCompanyMap}
            crossCards={crossCards}
            exchangeLogs={exchangeLogs}
          />
        )}
      </div>
    </PageShell>
  )
}

// ── CEO 화면 ─────────────────────────────────────────────────────────────────
function CeoView({ myCompanyId, initMyCard, ownCards, ownCompanyMap }: {
  myCompanyId: string
  initMyCard: OwnCard | null
  ownCards: OwnCard[]
  ownCompanyMap: Record<string, OwnCompany>
}) {
  const router = useRouter()
  const [offer, setOffer] = useState(initMyCard?.offer ?? '')
  const [want, setWant] = useState(initMyCard?.want ?? '')
  const [myCard, setMyCard] = useState<OwnCard | null>(initMyCard)
  const [busy, setBusy] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  async function saveCard() {
    if (!offer.trim() || !want.trim()) return
    setBusy(true)
    const res = await fetch('/api/exchange-card', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer: offer.trim(), want: want.trim() }),
    })
    setBusy(false)
    if (res.ok) {
      setMyCard({ company_id: myCompanyId, offer: offer.trim(), want: want.trim(), updated_at: new Date().toISOString() })
      if (!initMyCard) setShowConcept(true)
    } else {
      alert('저장 실패')
    }
  }

  const otherCards = ownCards.filter(c => c.company_id !== myCompanyId)

  return (
    <>
      {/* 교류 게시판 카드 등록 */}
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <div className="font-bold text-gray-800 text-lg mb-1">📋 교류 게시판 카드 등록</div>
          <p className="text-xs text-gray-400">박람회가 열리면 다른 반 공무원이 우리 카드를 보고 교류 요청을 해요</p>
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

        <button onClick={saveCard} disabled={busy || !offer.trim() || !want.trim()}
          className="bg-purple-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
          {busy ? '등록 중...' : myCard ? '✓ 카드 수정하기' : '카드 등록하기'}
        </button>

        {myCard && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
            <div className="text-xs text-purple-500 font-bold mb-2">📌 현재 등록된 카드</div>
            <p className="text-sm mb-1"><span className="text-purple-600 font-medium">줄 수 있는 것:</span> {myCard.offer}</p>
            <p className="text-sm"><span className="text-green-600 font-medium">원하는 것:</span> {myCard.want}</p>
          </div>
        )}
      </div>

      {/* 같은 반 다른 회사 카드 (참고용) */}
      {otherCards.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">🏢 우리 도시 다른 회사 카드 (참고용)</div>
          <div className="flex flex-col gap-3">
            {otherCards.map(card => {
              const co = ownCompanyMap[card.company_id]
              if (!co) return null
              return (
                <div key={card.company_id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="font-medium text-gray-800 mb-2">{co.icon} {co.display_name}</div>
                  <p className="text-sm mb-1"><span className="text-purple-500">🎁 줄 수 있어요:</span> {card.offer}</p>
                  <p className="text-sm"><span className="text-green-500">🙏 원해요:</span> {card.want}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showConcept && (
        <ConceptPopup kind="formative_exchange" stage={3}
          prompt="우리 지역에 없는 것을 다른 지역과 주고받는 것을 무엇이라 할까요?"
          options={['교류', '생산', '저축']} correct="교류"
          explanation="지역마다 가진 것이 달라서 서로 주고받아요. 이렇게 도움을 주고받는 것을 교류, 서로 의지하는 것을 상호의존이라고 해요."
          onClose={() => { setShowConcept(false); router.push('/home') }} />
      )}
    </>
  )
}

// ── 공무원 화면 ────────────────────────────────────────────────────────────
type OfficerTab = 'cards' | 'write' | 'logs'

function OfficerView({ fairMode, myCityName, ownCompanies, ownCards, ownCompanyMap, crossCards, exchangeLogs }: {
  fairMode: boolean; myCityName: string
  ownCompanies: OwnCompany[]; ownCards: OwnCard[]; ownCompanyMap: Record<string, OwnCompany>
  crossCards: CrossCard[]; exchangeLogs: ExchangeLog[]
}) {
  const [tab, setTab] = useState<OfficerTab>(fairMode ? 'cards' : 'logs')
  const [logs, setLogs] = useState<ExchangeLog[]>(exchangeLogs)

  // 교류 성사 일지 폼 상태
  const [fromCompanyId, setFromCompanyId] = useState('')
  const [toCityName, setToCityName] = useState('')
  const [toCompanyName, setToCompanyName] = useState('')
  const [giveText, setGiveText] = useState('')
  const [receivedText, setReceivedText] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function prefillFromCard(card: CrossCard) {
    setToCityName(card.city_name)
    setToCompanyName(card.company_name)
    setGiveText('')
    setReceivedText('')
    setNotes('')
    setSubmitted(false)
    setTab('write')
  }

  async function submitLog() {
    if (!fromCompanyId || !toCityName.trim() || !toCompanyName.trim() || !giveText.trim() || !receivedText.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/exchange-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromCompanyId, toCityName, toCompanyName, giveText, receivedText, notes }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      const newLog: ExchangeLog = {
        id: d.id, from_company_id: fromCompanyId,
        to_city_name: toCityName.trim(), to_company_name: toCompanyName.trim(),
        give_text: giveText.trim(), received_text: receivedText.trim(),
        notes: notes.trim() || null, created_at: new Date().toISOString(),
      }
      setLogs(prev => [newLog, ...prev])
      setSubmitted(true)
      setFromCompanyId(''); setToCityName(''); setToCompanyName('')
      setGiveText(''); setReceivedText(''); setNotes('')
    } else {
      alert(`오류: ${d.error}`)
    }
  }

  const TABS: Array<{ key: OfficerTab; label: string; emoji: string; disabled?: boolean }> = [
    { key: 'cards', label: '다른 도시 카드', emoji: '🌏', disabled: !fairMode },
    { key: 'write', label: '교류 성사 일지', emoji: '✍️' },
    { key: 'logs',  label: '교류 기록', emoji: '📋' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* 박람회 배너 */}
      {fairMode ? (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl px-4 py-3 text-purple-700 font-medium text-center">
          🎪 박람회 진행 중! 다른 도시 기업 카드를 열람하고 교류를 추진해요
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-gray-500 text-center text-sm">
          선생님이 박람회를 열면 다른 도시 기업 카드를 볼 수 있어요
        </div>
      )}

      {/* 탭 */}
      <div className="flex rounded-2xl bg-gray-100 p-1 gap-1">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => !t.disabled && setTab(t.key)}
            disabled={t.disabled}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all
              ${tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}
              ${t.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-gray-600'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'cards' && fairMode && (
        <CrossCardsTab crossCards={crossCards} myCityName={myCityName} onSelect={prefillFromCard} />
      )}

      {tab === 'write' && (
        <WriteLogTab
          ownCompanies={ownCompanies}
          fromCompanyId={fromCompanyId} setFromCompanyId={setFromCompanyId}
          toCityName={toCityName} setToCityName={setToCityName}
          toCompanyName={toCompanyName} setToCompanyName={setToCompanyName}
          giveText={giveText} setGiveText={setGiveText}
          receivedText={receivedText} setReceivedText={setReceivedText}
          notes={notes} setNotes={setNotes}
          submitting={submitting} submitted={submitted}
          onSubmit={submitLog}
        />
      )}

      {tab === 'logs' && (
        <LogsTab logs={logs} ownCompanyMap={ownCompanyMap} />
      )}
    </div>
  )
}

// ── 다른 도시 카드 탭 ────────────────────────────────────────────────────
function CrossCardsTab({ crossCards, myCityName, onSelect }: {
  crossCards: CrossCard[]; myCityName: string; onSelect: (c: CrossCard) => void
}) {
  const [filterCity, setFilterCity] = useState('')
  const cities = [...new Set(crossCards.map(c => c.city_name))]
  const filtered = filterCity ? crossCards.filter(c => c.city_name === filterCity) : crossCards

  if (crossCards.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
        <div className="text-4xl mb-3">📭</div>
        다른 도시에서 등록된 교류 카드가 없어요.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 도시 필터 */}
      {cities.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCity('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filterCity === '' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            전체
          </button>
          {cities.map(city => (
            <button key={city} onClick={() => setFilterCity(city)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filterCity === city ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {city}
            </button>
          ))}
        </div>
      )}

      {filtered.map(card => (
        <div key={`${card.class_id}-${card.company_id}`}
          className="bg-white rounded-3xl p-5 shadow-sm border-2 border-transparent">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-purple-500 font-bold mb-0.5">🏙️ {card.city_name}</div>
              <div className="font-bold text-gray-800 text-lg">{card.icon} {card.company_name}</div>
            </div>
            <button onClick={() => onSelect(card)}
              className="bg-purple-500 text-white rounded-xl px-4 py-2 text-sm font-bold active:scale-95 transition-transform shrink-0">
              교류 신청 →
            </button>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-sm space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-purple-500 shrink-0">🎁 줄 수 있어요</span>
              <span className="text-gray-700">{card.offer}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">🙏 원해요</span>
              <span className="text-gray-700">{card.want}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 교류 성사 일지 쓰기 탭 ────────────────────────────────────────────────
function WriteLogTab({
  ownCompanies, fromCompanyId, setFromCompanyId,
  toCityName, setToCityName, toCompanyName, setToCompanyName,
  giveText, setGiveText, receivedText, setReceivedText,
  notes, setNotes, submitting, submitted, onSubmit,
}: {
  ownCompanies: OwnCompany[]
  fromCompanyId: string; setFromCompanyId: (v: string) => void
  toCityName: string; setToCityName: (v: string) => void
  toCompanyName: string; setToCompanyName: (v: string) => void
  giveText: string; setGiveText: (v: string) => void
  receivedText: string; setReceivedText: (v: string) => void
  notes: string; setNotes: (v: string) => void
  submitting: boolean; submitted: boolean; onSubmit: () => void
}) {
  const canSubmit = fromCompanyId && toCityName.trim() && toCompanyName.trim() && giveText.trim() && receivedText.trim()

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
      <div>
        <div className="font-bold text-gray-800 text-lg mb-1">✍️ 교류 성사 일지 작성</div>
        <p className="text-xs text-gray-400">다른 도시 기업과 교류를 마친 후 건건이 기록해요</p>
      </div>

      {submitted && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 text-green-700 font-medium text-center">
          🎉 교류 성사 일지가 저장됐어요!
        </div>
      )}

      {/* 우리 회사 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5">🏭 우리 회사 (교류에 참여한 곳)</label>
        <select value={fromCompanyId} onChange={e => setFromCompanyId(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none bg-white">
          <option value="">-- 우리 회사를 선택하세요 --</option>
          {ownCompanies.map(co => (
            <option key={co.id} value={co.id}>{co.icon} {co.display_name}</option>
          ))}
        </select>
      </div>

      {/* 상대 도시 / 회사 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">🏙️ 상대 도시</label>
          <input value={toCityName} onChange={e => setToCityName(e.target.value)} maxLength={50}
            placeholder="예: 수원시"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">🏢 상대 회사</label>
          <input value={toCompanyName} onChange={e => setToCompanyName(e.target.value)} maxLength={100}
            placeholder="예: 수원 빵집"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
        </div>
      </div>

      {/* 교류 내용 */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5">📤 우리가 준 것</label>
        <input value={giveText} onChange={e => setGiveText(e.target.value)} maxLength={200}
          placeholder="우리가 상대 회사에 준 것을 적어요"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5">📥 우리가 받은 것</label>
        <input value={receivedText} onChange={e => setReceivedText(e.target.value)} maxLength={200}
          placeholder="상대 회사에서 받은 것을 적어요"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5">📝 교류 성사 소감 (선택)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          maxLength={500} rows={3} placeholder="교류를 마치고 느낀 점, 결과를 적어요"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 outline-none resize-none" />
      </div>

      <button onClick={onSubmit} disabled={submitting || !canSubmit}
        className="bg-purple-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
        {submitting ? '저장 중...' : '교류 성사 일지 저장하기 🤝'}
      </button>
    </div>
  )
}

// ── 교류 기록 탭 ──────────────────────────────────────────────────────────
function LogsTab({ logs, ownCompanyMap }: { logs: ExchangeLog[]; ownCompanyMap: Record<string, OwnCompany> }) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
        <div className="text-4xl mb-3">📋</div>
        아직 교류 성사 일지가 없어요.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-bold text-gray-500 px-1">총 {logs.length}건의 교류 기록</div>
      {logs.map(log => {
        const co = ownCompanyMap[log.from_company_id]
        return (
          <div key={log.id} className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤝</span>
              <div>
                <div className="font-bold text-gray-800">
                  {co ? `${co.icon} ${co.display_name}` : '우리 회사'} ↔ {log.to_city_name} {log.to_company_name}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-purple-500 shrink-0">📤 준 것</span>
                <span className="text-gray-700">{log.give_text}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 shrink-0">📥 받은 것</span>
                <span className="text-gray-700">{log.received_text}</span>
              </div>
            </div>
            {log.notes && (
              <div className="mt-2 text-sm text-gray-600 italic leading-relaxed px-1">
                💬 {log.notes}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
