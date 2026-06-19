'use client'

import { useState } from 'react'

interface UserRef { number: number; nickname: string | null }
interface Plan { id: string; content: { companyName?: string; whatToSell?: string; reason?: string }; status: string; feedback: string | null; users: UserRef | UserRef[] }
interface Research { id: string; specialties: string | null; strengths: string | null; oneliner: string | null; feedback: string | null; users: UserRef | UserRef[] }
interface Reflection { id: string; answer: string; mood: string | null; stage: number; feedback: string | null; users: UserRef | UserRef[] }

const TABS = [
  { key: 'plan', label: '📝 사업계획서' },
  { key: 'research', label: '🗺️ 도시 탐구' },
  { key: 'reflection', label: '💭 성찰' },
] as const

function uname(u: UserRef | UserRef[]) {
  const x = Array.isArray(u) ? u[0] : u
  return x?.nickname ?? `${x?.number}번`
}

export default function SubmissionsView({ plans, research, reflections, heading }: {
  plans: Plan[]; research: Research[]; reflections: Reflection[]; heading?: boolean
}) {
  const [tab, setTab] = useState<'plan' | 'research' | 'reflection'>('plan')

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="font-bold text-gray-800 mb-1">📥 학생 결과물</div>
      <p className="text-xs text-gray-400 mb-4">학생이 제출한 내용을 보고 피드백을 남겨요</p>

      <div>
        <div className="flex gap-2 mb-5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all
                ${tab === t.key ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {tab === 'plan' && plans.map(p => (
            <SubmissionCard key={p.id} type="plan" id={p.id} who={uname(p.users)} feedback={p.feedback}
              badge={p.status === 'selected' ? '선정' : undefined}>
              <p><b>{p.content?.companyName ?? '(이름없음)'}</b></p>
              <p className="text-gray-500">{p.content?.whatToSell}</p>
              {p.content?.reason && <p className="text-gray-400 text-xs mt-1">💪 {p.content.reason}</p>}
            </SubmissionCard>
          ))}
          {tab === 'research' && research.map(r => (
            <SubmissionCard key={r.id} type="research" id={r.id} who={uname(r.users)} feedback={r.feedback}>
              <p>🍙 {r.specialties} · 💪 {r.strengths}</p>
              <p className="text-gray-500">✏️ {r.oneliner}</p>
            </SubmissionCard>
          ))}
          {tab === 'reflection' && reflections.map(r => (
            <SubmissionCard key={r.id} type="reflection" id={r.id} who={uname(r.users)} feedback={r.feedback}>
              <p>{r.mood ?? '🙂'} {r.answer}</p>
            </SubmissionCard>
          ))}
          {((tab === 'plan' && plans.length === 0) || (tab === 'research' && research.length === 0) || (tab === 'reflection' && reflections.length === 0)) && (
            <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 제출물이 없어요.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({ type, id, who, feedback: initial, badge, children }: {
  type: string; id: string; who: string; feedback: string | null; badge?: string; children: React.ReactNode
}) {
  const [feedback, setFeedback] = useState(initial ?? '')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await fetch('/api/admin/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, feedback }),
    })
    setBusy(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-gray-800">{who}</span>
        {badge && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <div className="text-sm text-gray-700 mb-3">{children}</div>
      <div className="flex gap-2 items-end border-t border-gray-100 pt-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">✍️ 피드백</label>
          <input value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={100}
            placeholder="칭찬·조언을 적어요"
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
        </div>
        <button onClick={save} disabled={busy}
          className="bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
          {saved ? '✓' : busy ? '...' : '저장'}
        </button>
      </div>
    </div>
  )
}
