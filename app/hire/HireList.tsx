'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

interface Person { id: string; number: number; nickname: string | null }

export default function HireList({ stage, applicants, staff: initialStaff, maxStaff, notCeo }: {
  stage: Stage; applicants: Person[]; staff: Person[]; maxStaff: number; notCeo?: boolean
}) {
  const router = useRouter()
  const [staff, setStaff] = useState<Person[]>(initialStaff)
  const [pool, setPool] = useState<Person[]>(applicants)
  const [busy, setBusy] = useState<string | null>(null)

  if (notCeo) return (
    <PageShell title="직원 채용" emoji="👥">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">CEO만 직원을 채용할 수 있어요.</div>
    </PageShell>
  )

  const full = staff.length >= maxStaff

  async function hire(p: Person) {
    if (full) return
    setBusy(p.id)
    const res = await fetch('/api/hire', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicantId: p.id }),
    })
    setBusy(null)
    if (res.ok) {
      setStaff([...staff, p])
      setPool(pool.filter(x => x.id !== p.id))
    } else {
      const d = await res.json()
      alert(d.error === 'full' ? '직원이 다 찼어요 (최대 4명)' : `오류: ${d.error}`)
    }
  }

  return (
    <PageShell title="직원 채용" emoji="👥">
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">
            우리 직원 <span className="text-sm text-gray-400">({staff.length}/{maxStaff})</span>
          </div>
          {staff.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 직원이 없어요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staff.map(s => (
                <span key={s.id} className="bg-blue-100 text-blue-700 rounded-full px-4 py-2 font-medium text-sm">
                  🛠️ {s.nickname ?? `${s.number}번`}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">채용할 친구 고르기</div>
          <p className="text-xs text-gray-400 mb-3">{full ? '직원이 다 찼어요!' : '채용하면 바로 직원이 돼요'}</p>
          {pool.length === 0 ? (
            <p className="text-gray-400 text-sm">채용할 수 있는 지원자가 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pool.map(p => (
                <button key={p.id} onClick={() => hire(p)} disabled={full || busy === p.id}
                  className="bg-gray-50 border-2 border-gray-200 rounded-2xl py-3 font-medium text-gray-700
                    hover:border-blue-400 active:scale-95 transition-all disabled:opacity-40">
                  {busy === p.id ? '...' : `🙋 ${p.nickname ?? `${p.number}번`}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
