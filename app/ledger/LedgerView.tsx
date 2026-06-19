'use client'

import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

interface Row { type: string; amount: number; memo: string | null; created_at: string }

export default function LedgerView({ stage, rows, notAllowed }: {
  stage: Stage; rows: Row[]; notAllowed?: boolean
}) {
  if (notAllowed) return (
    <PageShell title="거래 장부" emoji="📖">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">공무원·시장만 볼 수 있어요.</div>
    </PageShell>
  )

  return (
    <PageShell title="거래 장부" emoji="📖">
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        {rows.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">아직 거래가 없어요.</p>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full mr-2">{r.type}</span>
                  <span className="text-sm text-gray-600">{r.memo ?? ''}</span>
                </div>
                <span className="font-medium text-gray-800">{r.amount.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
