'use client'

import { useState } from 'react'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'
import type { CompanyData } from './page'

export default function LedgerView({ stage, companies, notAllowed }: {
  stage: Stage; companies: CompanyData[]; notAllowed?: boolean
}) {
  const [selectedId, setSelectedId] = useState(companies[0]?.id ?? '')
  const co = companies.find(c => c.id === selectedId) ?? companies[0] ?? null

  if (notAllowed) return (
    <PageShell title="거래 장부" emoji="📖">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">공무원·시장만 볼 수 있어요.</div>
    </PageShell>
  )

  return (
    <PageShell title="거래 장부" emoji="📖">
      <div className="flex flex-col gap-4">
        {companies.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">🏭</div>
            아직 등록된 회사가 없어요.
          </div>
        ) : (
          <>
            {/* 회사 탭 */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {companies.map(c => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all
                    ${selectedId === c.id
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'}`}>
                  <span>{c.icon}</span>
                  <span>{c.display_name}</span>
                </button>
              ))}
            </div>

            {co && (
              <div className="flex flex-col gap-4">
                {/* CEO 업무일지 */}
                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <div className="font-bold text-gray-800 mb-3">
                    📝 CEO 업무일지
                    {co.ceo && <span className="text-sm font-normal text-gray-400 ml-2">({co.ceo.name})</span>}
                  </div>

                  {co.worklogs.length === 0 ? (
                    <div className="text-sm text-gray-400 py-2">
                      {co.ceo ? '아직 업무일지가 없어요.' : 'CEO가 아직 없어요.'}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {co.worklogs.map((wl, i) => (
                        <div key={i} className={`rounded-2xl p-4 ${i === 0 ? 'bg-blue-50 border-2 border-blue-100' : 'bg-gray-50'}`}>
                          <p className={`text-sm leading-relaxed ${i === 0 ? 'text-blue-800' : 'text-gray-700'}`}>
                            {wl.text}
                          </p>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {new Date(wl.created_at).toLocaleDateString('ko-KR', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                            {i === 0 && <span className="ml-2 text-blue-500 font-medium">최근</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 거래 내역 */}
                <div className="bg-white rounded-3xl p-6 shadow-sm">
                  <div className="font-bold text-gray-800 mb-3">💰 거래 내역</div>

                  {co.transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">아직 거래가 없어요.</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                      {co.transactions.map((tx, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full
                              ${tx.direction === 'in'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-600'}`}>
                              {tx.direction === 'in' ? '수입' : '지출'}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
                              {tx.type}
                            </span>
                            {tx.memo && (
                              <span className="text-sm text-gray-500 truncate">{tx.memo}</span>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className={`font-bold text-sm ${tx.direction === 'in' ? 'text-green-600' : 'text-gray-800'}`}>
                              {tx.direction === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}원
                            </span>
                            <div className="text-xs text-gray-400">
                              {new Date(tx.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
