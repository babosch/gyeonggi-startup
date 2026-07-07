'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Response {
  id: string
  studentName: string
  answer: string
  stage: number
  question: string
  concept: string
  feedback: string | null
  createdAt: string
}

const STAGE_LABEL: Record<number, string> = { 2: '생산', 3: '교류', 4: '판매' }

export default function InquiryResponsesView({ responses }: { responses: Response[] }) {
  // 질문(prompt)별로 묶기
  const groups = new Map<string, Response[]>()
  for (const r of responses) {
    const key = r.question || `(질문 없음)`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  // 단계 → 질문 순 정렬
  const ordered = [...groups.entries()].sort((a, b) => {
    const sa = a[1][0]?.stage ?? 0, sb = b[1][0]?.stage ?? 0
    return sa - sb || a[0].localeCompare(b[0])
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/home" className="text-gray-400 text-sm mb-4 inline-block">← 교사 홈</Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">🔍 탐구 질문 응답</h1>
        <p className="text-sm text-gray-400 mb-5">업무일지 전 학생들이 답한 개념 탐구 질문을 개념별로 모아 봐요.</p>

        {responses.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            아직 탐구 질문 응답이 없어요. (생산 단계부터 쌓여요)
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {ordered.map(([question, list]) => {
              const first = list[0]
              return (
                <div key={question} className="bg-white rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold bg-purple-100 text-purple-700 rounded-full px-2.5 py-1">{first.concept}</span>
                    <span className="text-xs text-gray-400">{STAGE_LABEL[first.stage] ?? `${first.stage}단계`} · {list.length}명 응답</span>
                  </div>
                  <div className="font-bold text-gray-800 mb-3 leading-relaxed">{question}</div>

                  <div className="flex flex-col gap-2">
                    {list.map(r => <ResponseRow key={r.id} r={r} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ResponseRow({ r }: { r: Response }) {
  const [feedback, setFeedback] = useState(r.feedback ?? '')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const res = await fetch('/api/admin/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reflection', id: r.id, feedback }),
    })
    setBusy(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  }

  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-bold text-gray-700 text-sm">{r.studentName}</span>
          <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{r.answer}</p>
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="shrink-0 text-xs text-blue-500 font-medium">
          {r.feedback && !open ? '✍️ 피드백 있음' : open ? '닫기' : '✍️ 피드백'}
        </button>
      </div>
      {open && (
        <div className="flex gap-2 items-end mt-2 pt-2 border-t border-gray-200">
          <input value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={100}
            placeholder="칭찬·조언을 적어요"
            className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none bg-white" />
          <button onClick={save} disabled={busy}
            className="bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50">
            {saved ? '✓' : busy ? '...' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
}
