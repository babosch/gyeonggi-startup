'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import type { Stage } from '@/lib/types'

interface Worklog { id: string; text: string; status: string; feedback: string | null; created_at: string }

const DAILY_MAX = 2

export default function WorklogForm({ stage, role, today, firstEver }: {
  stage: Stage; role: string; today: Worklog[]; firstEver: boolean
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  if (role !== 'staff' && role !== 'ceo' && role !== 'officer') {
    return <PageShell title="업무일지" emoji="📒">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">직원·CEO·공무원만 사용해요.</div>
    </PageShell>
  }

  const canWriteNew = today.length < DAILY_MAX
  const writing = editingId !== null || canWriteNew

  function startEdit(w: Worklog) {
    setEditingId(w.id)
    setText(w.text)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function cancelEdit() {
    setEditingId(null)
    setText('')
  }

  async function submit() {
    setSaving(true)
    const res = await fetch('/api/worklog', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, worklogId: editingId }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      if (d.error === 'daily_limit') alert(`업무일지는 하루 ${DAILY_MAX}건까지 쓸 수 있어요.`)
      else if (d.error === 'already_paid') alert('이미 급여가 지급된 일지는 수정할 수 없어요.')
      else alert(`오류: ${d.error}`)
      return
    }
    if (firstEver && !editingId) { setShowConcept(true); return }
    setEditingId(null)
    setText('')
    router.refresh()
  }

  const statusBadge = (s: string) =>
    s === 'paid' ? <span className="text-xs font-bold bg-green-100 text-green-700 rounded-full px-2.5 py-1">💰 지급완료</span>
    : s === 'rejected' ? <span className="text-xs font-bold bg-red-100 text-red-600 rounded-full px-2.5 py-1">✗ 반려됨</span>
    : <span className="text-xs font-bold bg-gray-100 text-gray-500 rounded-full px-2.5 py-1">✓ 제출됨 · 확인 대기</span>

  return (
    <PageShell title="업무일지" emoji="📒">
      <div className="flex flex-col gap-4">
        {/* 작성/수정 영역 */}
        {writing ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            {editingId && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium text-center">
                ✏️ 반려된 일지를 수정 중이에요. 고친 뒤 다시 제출하세요.
              </div>
            )}
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                오늘 한 일을 적어요 {!editingId && <span className="text-gray-400 text-sm">({today.length + 1}번째 / 하루 {DAILY_MAX}건)</span>}
              </label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={200}
                placeholder="예: 책갈피 10개를 코팅했어요"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base focus:border-blue-400 outline-none resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={submit} disabled={saving || !text.trim()}
                className="flex-1 bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
                {saving ? '...' : editingId ? '다시 제출하기' : '오늘 일지 저장'}
              </button>
              {editingId && (
                <button onClick={cancelEdit} disabled={saving}
                  className="border-2 border-gray-200 text-gray-500 rounded-2xl px-5 font-medium disabled:opacity-40">
                  취소
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 text-center">일지를 쓰면 지급자가 확인 후 승인하고 급여를 줘요</p>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-6 text-center text-gray-500">
            오늘 업무일지 {DAILY_MAX}건을 다 썼어요. 반려된 일지가 있으면 아래에서 수정할 수 있어요.
          </div>
        )}

        {/* 오늘 일지 목록 */}
        {today.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-3">
            <div className="font-bold text-gray-800">오늘 쓴 업무일지 ({today.length}/{DAILY_MAX})</div>
            {today.map(w => (
              <div key={w.id} className="border-2 border-gray-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  {statusBadge(w.status)}
                  <span className="text-xs text-gray-400">
                    {new Date(w.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{w.text}</p>
                {w.status === 'rejected' && (
                  <div className="mt-2">
                    {w.feedback && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-2">
                        반려 사유: {w.feedback}
                      </div>
                    )}
                    <button onClick={() => startEdit(w)}
                      className="text-blue-600 border-2 border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold active:scale-95 transition-transform">
                      ✏️ 수정하기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showConcept && (
        <ConceptPopup kind="formative_work" stage={2}
          prompt="재료를 사서 물건을 만드는 활동을 무엇이라고 할까요?"
          options={['생산', '소비', '교환']} correct="생산"
          explanation="필요한 것을 만들어 내는 활동을 생산이라고 해요. 만든 물건을 쓰거나 사는 것은 소비예요."
          onClose={() => { setShowConcept(false); router.push('/home') }} />
      )}
    </PageShell>
  )
}
