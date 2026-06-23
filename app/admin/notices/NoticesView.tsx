'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Notice {
  id: string
  author_id: string | null
  author_city: string
  title: string
  body: string
  visible_to_students: boolean
  created_at: string
}

export default function NoticesView({ notices, myId }: { notices: Notice[]; myId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [showStudents, setShowStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function create() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/notices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), visibleToStudents: showStudents }),
    })
    setSaving(false)
    if (res.ok) {
      setTitle('')
      setBody('')
      setShowStudents(false)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(`등록 실패: ${d.error ?? res.status}`)
    }
  }

  async function toggleVisible(id: string, next: boolean) {
    setBusy(id)
    const res = await fetch('/api/admin/notices', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, visibleToStudents: next }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else {
      const d = await res.json().catch(() => ({}))
      alert(`변경 실패: ${d.error ?? res.status}`)
    }
  }

  async function remove(id: string) {
    if (!confirm('이 공통사항을 삭제할까요?')) return
    setBusy(id)
    const res = await fetch('/api/admin/notices', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setBusy(null)
    if (res.ok) router.refresh()
    else {
      const d = await res.json().catch(() => ({}))
      alert(`삭제 실패: ${d.error ?? res.status}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-4">← 관리자 홈</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">📢 시장 공통사항</h1>
        <p className="text-gray-500 text-sm mb-6">
          시장(교사)들이 협의한 공통 규칙·안내를 함께 봐요. 모든 반 선생님에게 공유돼요.
          <span className="block text-xs text-gray-400 mt-0.5">기본은 교사 전용이며, 원하면 글마다 학생 공개를 켤 수 있어요.</span>
        </p>

        {/* 작성 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-3 mb-6">
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
            placeholder="제목 (예: 판매 단가 상한 협의)"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-400 outline-none font-medium" />
          <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} rows={4}
            placeholder="공통사항 내용을 적어요"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-400 outline-none resize-none" />
          <label className="flex items-center gap-3 cursor-pointer bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-3">
            <input type="checkbox" checked={showStudents} onChange={e => setShowStudents(e.target.checked)} className="w-5 h-5" />
            <span className="text-sm font-medium text-amber-800">
              📢 학생에게도 공개 <span className="text-xs text-amber-600">(각 반 학생 홈 공지로 표시)</span>
            </span>
          </label>
          <button onClick={create} disabled={saving || !title.trim() || !body.trim()}
            className="bg-blue-500 text-white rounded-2xl py-3.5 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform">
            {saving ? '등록 중...' : '공통사항 올리기'}
          </button>
        </div>

        {/* 목록 */}
        {notices.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            아직 등록된 공통사항이 없어요.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notices.map(n => (
              <div key={n.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-gray-800 text-lg">{n.title}</div>
                    {n.visible_to_students && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-bold rounded-full px-2 py-0.5">📢 학생 공개</span>
                    )}
                  </div>
                  {n.author_id === myId && (
                    <button onClick={() => remove(n.id)} disabled={busy === n.id}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0 disabled:opacity-40">
                      {busy === n.id ? '...' : '🗑 삭제'}
                    </button>
                  )}
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{n.body}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="bg-gray-100 rounded-full px-2.5 py-0.5 font-medium">{n.author_city || '시장'}</span>
                    <span>{new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {n.author_id === myId && (
                    <button onClick={() => toggleVisible(n.id, !n.visible_to_students)} disabled={busy === n.id}
                      className={`text-xs font-bold rounded-full px-3 py-1.5 border-2 transition-colors disabled:opacity-40
                        ${n.visible_to_students
                          ? 'border-amber-200 text-amber-700 bg-amber-50'
                          : 'border-gray-200 text-gray-500'}`}>
                      {busy === n.id ? '...' : n.visible_to_students ? '학생 공개 끄기' : '📢 학생에게 공개'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
