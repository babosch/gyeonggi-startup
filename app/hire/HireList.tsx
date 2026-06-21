'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

interface Person { id: string; number: number; nickname: string | null }
interface Application {
  id: string
  applicantId: string
  motivation: string
  status: string   // 'pending' | 'hired' | 'rejected'
  user: Person | null
}

export default function HireList({ stage, applications: initApps, staff: initialStaff, maxStaff, notCeo }: {
  stage: Stage
  applications: Application[]
  staff: Person[]
  maxStaff: number
  notCeo?: boolean
}) {
  const router = useRouter()
  const [apps, setApps] = useState<Application[]>(initApps)
  const [staff, setStaff] = useState<Person[]>(initialStaff)
  const [busy, setBusy] = useState<string | null>(null)

  if (notCeo) return (
    <PageShell title="직원 채용" emoji="👥">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">
        <div className="text-4xl mb-4">💼</div>
        CEO만 직원 채용 화면을 볼 수 있어요.<br />
        <span className="text-sm mt-1 block">직원으로 입사하려면 각 회사 사업계획서를 확인 후 지원하세요.</span>
        <button onClick={() => router.push('/apply')} className="mt-5 bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold">
          취업 지원하기
        </button>
      </div>
    </PageShell>
  )

  const full = staff.length >= maxStaff
  const pendingApps = apps.filter(a => a.status === 'pending')
  const rejectedApps = apps.filter(a => a.status === 'rejected')

  async function decide(appId: string, action: 'hire' | 'reject') {
    setBusy(appId)
    const res = await fetch('/api/apply', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: appId, action }),
    })
    setBusy(null)
    if (res.ok) {
      if (action === 'hire') {
        const app = apps.find(a => a.id === appId)
        if (app?.user) setStaff([...staff, app.user])
        setApps(apps.map(a => a.id === appId ? { ...a, status: 'hired' }
          : a.applicantId === apps.find(x => x.id === appId)?.applicantId ? { ...a, status: 'rejected' }
          : a))
      } else {
        setApps(apps.map(a => a.id === appId ? { ...a, status: 'rejected' } : a))
      }
    } else {
      const d = await res.json()
      if (d.error === 'full') alert('직원이 다 찼어요 (최대 4명)')
      else if (d.error === 'already_hired') alert('이미 다른 회사에 채용된 학생이에요!')
      else alert(`오류: ${d.error}`)
    }
  }

  return (
    <PageShell title="직원 채용" emoji="👥">
      <div className="flex flex-col gap-4">
        {/* 현재 직원 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">
            우리 직원 <span className="text-sm text-gray-400">({staff.length}/{maxStaff})</span>
          </div>
          {staff.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 직원이 없어요. 지원서를 검토해 채용해요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staff.map(s => (
                <span key={s.id} className="bg-blue-100 text-blue-700 rounded-full px-4 py-2 font-medium text-sm">
                  🛠️ {s.nickname ?? `${s.number}번`}
                </span>
              ))}
            </div>
          )}
          {full && <p className="mt-2 text-amber-600 text-sm font-medium">직원이 다 찼어요!</p>}
        </div>

        {/* 대기 중인 지원서 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">
            📬 지원서 검토 <span className="text-sm text-gray-400">({pendingApps.length}건)</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">지원 동기를 읽고 채용 여부를 결정해요</p>

          {pendingApps.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              아직 지원서가 없어요.<br />
              <span className="text-xs">지원자들이 지원하면 여기에 표시돼요</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingApps.map(a => (
                <div key={a.id} className="border-2 border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-800">
                      🙋 {a.user?.nickname ?? `${a.user?.number}번`}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 mb-3 leading-relaxed">
                    "{a.motivation}"
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => decide(a.id, 'hire')} disabled={!!busy || full}
                      className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
                      {busy === a.id ? '...' : '✅ 채용'}
                    </button>
                    <button onClick={() => decide(a.id, 'reject')} disabled={!!busy}
                      className="flex-1 border-2 border-gray-200 text-gray-500 rounded-xl py-2.5 font-medium text-sm disabled:opacity-40 active:scale-95 transition-transform">
                      {busy === a.id ? '...' : '❌ 거절'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 거절된 지원서 (접을 수 있는 섹션) */}
        {rejectedApps.length > 0 && (
          <details className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <summary className="px-6 py-4 font-bold text-gray-500 cursor-pointer select-none">
              거절한 지원서 ({rejectedApps.length})
            </summary>
            <div className="px-6 pb-4 flex flex-col gap-2">
              {rejectedApps.map(a => (
                <div key={a.id} className="flex justify-between items-center py-2 border-t border-gray-100 text-sm">
                  <span className="text-gray-500">{a.user?.nickname ?? `${a.user?.number}번`}</span>
                  <span className="text-gray-400 text-xs">{a.motivation.slice(0, 30)}{a.motivation.length > 30 ? '…' : ''}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </PageShell>
  )
}
