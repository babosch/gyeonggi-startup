'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Cls { id: string; name: string }
interface Company { id: string; display_name: string; icon: string; class_id: string }
interface Card { company_id: string; class_id: string; offer: string; want: string; updated_at: string }
interface Log {
  id: string; class_id: string; from_company_id: string
  to_city_name: string; to_company_name: string
  give_text: string; received_text: string; notes: string | null; created_at: string
}

export default function ExchangeMonitorView({ myClassId, classes, companies, cards, logs }: {
  myClassId: string
  classes: Cls[]
  companies: Company[]
  cards: Card[]
  logs: Log[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'cards' | 'logs'>('cards')
  const [filterCity, setFilterCity] = useState<string>('')

  const companyMap = Object.fromEntries(companies.map(c => [c.id, c]))
  const classMap = Object.fromEntries(classes.map(c => [c.id, c]))

  // 도시별 카드 그룹
  const cardsByClass: Record<string, Card[]> = {}
  for (const card of cards) {
    if (!cardsByClass[card.class_id]) cardsByClass[card.class_id] = []
    cardsByClass[card.class_id].push(card)
  }

  const cities = classes.map(c => c.name)
  const filteredLogs = filterCity
    ? logs.filter(l => classMap[l.class_id]?.name === filterCity || l.to_city_name === filterCity)
    : logs

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => window.history.length > 1 ? router.back() : router.push('/home')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-5 hover:text-red-600 active:scale-95 transition-all">
          <span className="text-2xl font-black">←</span>
          <span>이전으로</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">🤝 교류 전체 모니터링</h1>
        <p className="text-sm text-gray-400 mb-5">전체 도시 교류 카드 · 공무원 교류 성사 일지</p>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-purple-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-purple-600">{classes.length}</div>
            <div className="text-xs text-purple-500 font-medium mt-1">참여 도시</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-blue-600">{cards.length}</div>
            <div className="text-xs text-blue-500 font-medium mt-1">교류 카드</div>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-green-600">{logs.length}</div>
            <div className="text-xs text-green-500 font-medium mt-1">교류 성사 건</div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex rounded-2xl bg-gray-100 p-1 gap-1 mb-4">
          {([
            { key: 'cards', label: '🌏 도시별 교류 카드', count: cards.length },
            { key: 'logs',  label: '📋 교류 성사 일지',   count: logs.length },
          ] as const).map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-1.5
                ${tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {t.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold
                ${tab === t.key ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-400'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* 도시별 교류 카드 탭 */}
        {tab === 'cards' && (
          <div className="flex flex-col gap-4">
            {classes.length === 0 && (
              <Empty text="등록된 도시가 없어요" />
            )}
            {classes.map(cls => {
              const clsCards = cardsByClass[cls.id] ?? []
              return (
                <div key={cls.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden
                  ${cls.id === myClassId ? 'ring-2 ring-blue-300' : ''}`}>
                  <div className="px-5 py-4 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-700 text-lg">🏙️ {cls.name}</span>
                      {cls.id === myClassId && (
                        <span className="text-xs bg-blue-100 text-blue-600 font-bold rounded-full px-2 py-0.5">우리 반</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-400">{clsCards.length}장</span>
                  </div>

                  {clsCards.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-400">아직 등록된 교류 카드가 없어요</div>
                  ) : (
                    <div className="px-5 pb-5 pt-3 flex flex-col gap-3">
                      {clsCards.map(card => {
                        const co = companyMap[card.company_id]
                        return (
                          <div key={card.company_id} className="bg-gray-50 rounded-2xl p-4">
                            <div className="font-bold text-gray-800 mb-2">
                              {co ? `${co.icon} ${co.display_name}` : '(알 수 없는 회사)'}
                            </div>
                            <div className="text-sm space-y-1">
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
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 교류 성사 일지 탭 */}
        {tab === 'logs' && (
          <div className="flex flex-col gap-4">
            {/* 도시 필터 */}
            {cities.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilterCity('')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${filterCity === '' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  전체
                </button>
                {cities.map(city => (
                  <button key={city} onClick={() => setFilterCity(city)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${filterCity === city ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {city}
                  </button>
                ))}
              </div>
            )}

            {filteredLogs.length === 0 ? (
              <Empty text="교류 성사 일지가 없어요" />
            ) : (
              filteredLogs.map(log => {
                const co = companyMap[log.from_company_id]
                const fromCity = classMap[log.class_id]?.name ?? '?'
                return (
                  <div key={log.id} className="bg-white rounded-3xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-800">
                          {co ? `${co.icon} ${co.display_name}` : '(회사 정보 없음)'}
                          <span className="text-sm text-gray-400 font-normal ml-2">({fromCity})</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-gray-400 text-sm">↔</span>
                          <span className="text-sm font-medium text-purple-600">{log.to_city_name}</span>
                          <span className="text-sm text-gray-600">{log.to_company_name}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0 ml-3">
                        {new Date(log.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
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
                      <div className="mt-2 text-sm text-gray-500 italic leading-relaxed px-1">
                        💬 {log.notes}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-3xl p-12 text-center text-gray-400 shadow-sm">
      <div className="text-4xl mb-3">📭</div>
      <p>{text}</p>
    </div>
  )
}
