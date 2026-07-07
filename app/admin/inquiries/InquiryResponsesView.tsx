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
  rejected: boolean
  createdAt: string
}

const STAGE_LABEL: Record<number, string> = { 2: '생산', 3: '교류', 4: '판매' }

export default function InquiryResponsesView({ responses, unanswered = [] }: {
  responses: Response[]; unanswered?: { id: string; name: string }[]
}) {
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

        <UnansweredSection initial={unanswered} />

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

function UnansweredSection({ initial }: { initial: { id: string; name: string }[] }) {
  const [list, setList] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function request(id: string) {
    setBusy(id)
    const res = await fetch('/api/admin/inquiry-request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(null)
    if (res.ok) setList(prev => prev.filter(s => s.id !== id))
    else if (d.error === 'already_answered') { alert('이미 오늘 답한 학생이에요.'); setList(prev => prev.filter(s => s.id !== id)) }
    else alert(`오류: ${d.error}`)
  }

  async function requestAll() {
    for (const s of [...list]) await request(s.id)
  }

  if (list.length === 0) return null
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-amber-800">✍️ 아직 안 쓴 학생 ({list.length}명)</div>
        <button onClick={requestAll} className="text-xs font-bold text-white bg-amber-500 rounded-full px-3 py-1.5">
          전체 작성 요청
        </button>
      </div>
      <p className="text-xs text-amber-600 mb-3">작성 요청하면 그 학생의 <b>내 카드가 잠기고</b>, 업무일지에서 질문이 떠요. 답하면 자동으로 풀려요.</p>
      <div className="flex flex-col gap-2">
        {list.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-white rounded-2xl px-4 py-2.5">
            <span className="font-medium text-gray-700 text-sm">{s.name}</span>
            <button onClick={() => request(s.id)} disabled={busy === s.id}
              className="text-xs font-bold text-white bg-blue-500 rounded-xl px-3 py-1.5 disabled:opacity-40 active:scale-95 transition-transform">
              {busy === s.id ? '...' : '작성 요청 (카드 잠금)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResponseRow({ r }: { r: Response }) {
  const [feedback, setFeedback] = useState(r.feedback ?? '')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejected, setRejected] = useState(r.rejected)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectText, setRejectText] = useState('')

  async function save() {
    setBusy(true)
    const res = await fetch('/api/admin/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reflection', id: r.id, feedback }),
    })
    setBusy(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  }

  async function reject() {
    setBusy(true)
    const res = await fetch('/api/admin/inquiry-reject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflectionId: r.id, feedback: rejectText.trim() }),
    })
    setBusy(false)
    if (res.ok) { setRejected(true); setRejectOpen(false); setRejectText('') }
    else { const d = await res.json().catch(() => ({})); alert(`오류: ${d.error}`) }
  }

  return (
    <div className={`rounded-2xl px-4 py-3 ${rejected ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-bold text-gray-700 text-sm">{r.studentName}</span>
          {rejected && <span className="ml-2 text-xs font-bold bg-red-100 text-red-600 rounded-full px-2 py-0.5">반려됨 · 재작성 대기</span>}
          <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{r.answer}</p>
        </div>
        {!rejected && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-500 font-medium">
              {r.feedback && !open ? '✍️ 피드백 있음' : open ? '닫기' : '✍️ 피드백'}
            </button>
            <button onClick={() => setRejectOpen(o => !o)} className="text-xs text-red-500 font-medium">
              ✗ 반려
            </button>
          </div>
        )}
      </div>

      {open && !rejected && (
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

      {rejectOpen && !rejected && (
        <div className="mt-2 pt-2 border-t border-red-200 flex flex-col gap-2">
          <input value={rejectText} onChange={e => setRejectText(e.target.value)} maxLength={200}
            placeholder="반려 사유 (예: 낱말만 넣고 생각을 안 썼어요)"
            className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none bg-white" />
          <div className="flex gap-2">
            <button onClick={reject} disabled={busy || !rejectText.trim()}
              className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-bold disabled:opacity-40">
              반려하기 (학생이 다시 씀)
            </button>
            <button onClick={() => { setRejectOpen(false); setRejectText('') }}
              className="flex-1 border-2 border-gray-200 text-gray-500 rounded-xl py-2 text-sm font-medium">취소</button>
          </div>
        </div>
      )}
    </div>
  )
}
