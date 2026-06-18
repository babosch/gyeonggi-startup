'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Person { id: string; number: number; nickname: string | null }

export default function OfficerManager({ applicants, officers: initial }: {
  applicants: Person[]; officers: Person[]
}) {
  const router = useRouter()
  const [officers, setOfficers] = useState<Person[]>(initial)
  const [pool, setPool] = useState<Person[]>(applicants)
  const [busy, setBusy] = useState<string | null>(null)

  async function appoint(p: Person) {
    setBusy(p.id)
    const res = await fetch('/api/admin/appoint-officer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: p.id, action: 'appoint' }),
    })
    setBusy(null)
    if (res.ok) { setOfficers([...officers, p]); setPool(pool.filter(x => x.id !== p.id)) }
  }

  async function dismiss(p: Person) {
    setBusy(p.id)
    const res = await fetch('/api/admin/appoint-officer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: p.id, action: 'dismiss' }),
    })
    setBusy(null)
    if (res.ok) { setPool([...pool, p]); setOfficers(officers.filter(x => x.id !== p.id)) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-4">← 관리자 홈</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-5">📋 공무원 임명</h1>

        <div className="bg-white rounded-3xl p-6 shadow-sm mb-4">
          <div className="font-bold text-gray-800 mb-3">현재 공무원 <span className="text-sm text-gray-400">({officers.length}명)</span></div>
          {officers.length === 0 ? <p className="text-gray-400 text-sm">아직 없어요.</p> : (
            <div className="flex flex-wrap gap-2">
              {officers.map(o => (
                <button key={o.id} onClick={() => dismiss(o)} disabled={busy === o.id}
                  className="bg-blue-100 text-blue-700 rounded-full px-4 py-2 font-medium text-sm">
                  📋 {o.nickname ?? `${o.number}번`} <span className="text-blue-400 ml-1">✕</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">지원자 중 임명하기</div>
          <p className="text-xs text-gray-400 mb-3">임명하면 바로 공무원이 돼요 (학생 화면 즉시 알림)</p>
          {pool.length === 0 ? <p className="text-gray-400 text-sm">임명할 지원자가 없어요.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pool.map(p => (
                <button key={p.id} onClick={() => appoint(p)} disabled={busy === p.id}
                  className="bg-gray-50 border-2 border-gray-200 rounded-2xl py-3 font-medium text-gray-700 hover:border-blue-400 active:scale-95 transition-all disabled:opacity-40">
                  {busy === p.id ? '...' : `🙋 ${p.nickname ?? `${p.number}번`}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
